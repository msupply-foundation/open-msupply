use crate::{
    migrations::{helpers::max_sequence, ChangelogPartitionConfig},
    RepositoryError, StorageConnection,
};
use diesel::{
    prelude::*,
    sql_types::{BigInt, Nullable, Text},
};

/// Catch-all for rows above every range partition; the top-up moves them out.
const DEFAULT_PARTITION: &str = "changelog_p_default";

/// Outcome of one [`ensure_partition_lookahead`] call.
#[derive(Debug, PartialEq, Eq)]
pub enum PartitionTopUp {
    /// Every partition needed was created (0 means headroom was already
    /// sufficient). `overflow_rows`: rows found in the DEFAULT partition at the
    /// start of the call, all now moved into range partitions.
    Created {
        partitions: usize,
        overflow_rows: i64,
    },
    /// The tick hit a lock timeout. `created` partitions were committed
    /// before the one that timed out; `headroom` is how many cursor values
    /// remain insertable above `max(cursor)`; `overflow_rows` as for
    /// `Created`, not all moved yet. Retry on the next tick.
    LockedOut {
        headroom: i64,
        created: usize,
        overflow_rows: i64,
    },
}

/// Standalone table shaped like `changelog`, not yet attached. `INCLUDING ALL`
/// copies the PK index for Postgres to adopt on attach; do not trim it.
fn create_standalone_partition_table(
    connection: &StorageConnection,
    lower: i64,
) -> Result<(), RepositoryError> {
    diesel::sql_query(format!(
        "CREATE TABLE changelog_p_{lower} (LIKE changelog INCLUDING ALL)"
    ))
    .execute(connection.lock().connection())?;
    Ok(())
}

/// `ATTACH PARTITION` takes `SHARE UPDATE EXCLUSIVE` on `changelog` (Postgres
/// 12+), so inserts are not blocked, and `ACCESS EXCLUSIVE` on the DEFAULT
/// partition. `CREATE TABLE … PARTITION OF` would take `ACCESS EXCLUSIVE`.
fn attach_range_partition(
    connection: &StorageConnection,
    lower: i64,
    upper: i64,
) -> Result<(), RepositoryError> {
    diesel::sql_query(format!(
        "ALTER TABLE changelog ATTACH PARTITION changelog_p_{lower} \
         FOR VALUES FROM ({lower}) TO ({upper})"
    ))
    .execute(connection.lock().connection())?;
    Ok(())
}

/// Ensure enough future cursor-range partitions exist on `changelog` to keep
/// `config.lookahead` cursor records of empty headroom above `max(cursor)`,
/// moving any rows spilled into the DEFAULT partition into range partitions.
///
/// Each partition is created in its own transaction under a `lock_timeout`
/// (the catalog reads too: `pg_get_expr` takes a read lock on each partition).
/// Spilled rows for a range are moved into its table before the attach, which
/// Postgres refuses otherwise. A DDL timeout yields
/// [`PartitionTopUp::LockedOut`]; a read timeout is an ordinary error.
///
/// Postgres-only behaviour. Under SQLite the function returns immediately —
/// SQLite has no partitions to top up.
pub fn ensure_partition_lookahead(
    connection: &StorageConnection,
    config: &ChangelogPartitionConfig,
) -> Result<PartitionTopUp, RepositoryError> {
    if !cfg!(feature = "postgres") {
        return Ok(PartitionTopUp::Created {
            partitions: 0,
            overflow_rows: 0,
        });
    }

    let (max_upper, overflow_rows, current_max) = connection
        .transaction_sync(|connection| {
            set_lock_timeout(connection)?;
            Ok::<_, RepositoryError>((
                max_partition_upper_bound(connection)?,
                default_partition_stats(connection)?.count,
                max_sequence(connection)?,
            ))
        })
        .map_err(|e| e.to_inner_error())?;

    if max_upper == 0 {
        // `changelog` isn't partitioned (pre-migration) or has no partitions —
        // should not reach this state. Should we panic or throw error instead? For now, just log and return.
        log::warn!("changelog partition lookahead: changelog table is not partitioned or has no partitions");
        return Ok(PartitionTopUp::Created {
            partitions: 0,
            overflow_rows: 0,
        });
    }

    let size = config.partition_size;
    let target_headroom = config.lookahead;

    // Nothing to do: skip the loop, which locks the DEFAULT.
    if max_upper - current_max >= target_headroom && overflow_rows == 0 {
        return Ok(PartitionTopUp::Created {
            partitions: 0,
            overflow_rows: 0,
        });
    }

    let mut created = 0;
    let mut next_lower = max_upper;
    loop {
        let next_upper = next_lower + size;
        let needs_headroom = next_lower - current_max < target_headroom;
        let result = connection.transaction_sync(|connection| {
            set_default_lock_timeout(connection)?;
            // Attach takes this lock anyway; take it first so no row lands in
            // the DEFAULT between the move and the attach.
            diesel::sql_query(format!(
                "LOCK TABLE {DEFAULT_PARTITION} IN ACCESS EXCLUSIVE MODE"
            ))
            .execute(connection.lock().connection())?;
            let spilled_max = default_partition_stats(connection)?.max;
            let range_spilled = spilled_max.map_or(false, |max| max >= next_lower);
            if !range_spilled && !needs_headroom {
                return Ok(None);
            }

            create_standalone_partition_table(connection, next_lower)?;
            let moved = if range_spilled {
                diesel::sql_query(format!(
                    "WITH moved AS (\
                        DELETE FROM {DEFAULT_PARTITION} \
                        WHERE cursor >= {next_lower} AND cursor < {next_upper} RETURNING *\
                     ) INSERT INTO changelog_p_{next_lower} SELECT * FROM moved"
                ))
                .execute(connection.lock().connection())?
            } else {
                0
            };
            attach_range_partition(connection, next_lower, next_upper)?;
            Ok::<_, RepositoryError>(Some(moved))
        });

        match result {
            Ok(Some(moved)) => {
                log::info!(
                    "changelog partition created changelog_p_{} [{}..{})",
                    next_lower,
                    next_lower,
                    next_upper
                );
                if moved > 0 {
                    log::warn!(
                        "changelog partition: moved {moved} row(s) from {DEFAULT_PARTITION} \
                         into changelog_p_{next_lower}"
                    );
                }
                next_lower = next_upper;
                created += 1;
            }
            Ok(None) => {
                return Ok(PartitionTopUp::Created {
                    partitions: created,
                    overflow_rows,
                });
            }
            Err(error) => {
                let error = error.to_inner_error();
                return if is_lock_timeout(&error) {
                    Ok(PartitionTopUp::LockedOut {
                        headroom: next_lower - current_max,
                        created,
                        overflow_rows,
                    })
                } else {
                    Err(error)
                };
            }
        }
    }
}

/// `SET LOCAL`: the timeout ends with the current transaction.
fn set_lock_timeout(connection: &StorageConnection) -> Result<(), RepositoryError> {
    diesel::sql_query("SET LOCAL lock_timeout = '2s'").execute(connection.lock().connection())?;
    Ok(())
}

/// Shorter: reads of the DEFAULT queue behind a pending lock on it.
fn set_default_lock_timeout(connection: &StorageConnection) -> Result<(), RepositoryError> {
    diesel::sql_query("SET LOCAL lock_timeout = '500ms'")
        .execute(connection.lock().connection())?;
    Ok(())
}

/// Postgres reports SQLSTATE `55P03` (lock_not_available) for a `lock_timeout`
/// expiry as "canceling statement due to lock timeout". Diesel 2.3 does not
/// expose the SQLSTATE, only the message, so this matches the text. A server
/// with a non-English `lc_messages` would report the timeout as a plain error
/// instead of `LockedOut`; the loop still retries next tick either way.
fn is_lock_timeout(error: &RepositoryError) -> bool {
    match error {
        RepositoryError::DBError { extra, .. } => extra.contains("lock timeout"),
        _ => false,
    }
}

/// Returns the highest cursor upper bound across `changelog`'s partitions, or
/// 0 if `changelog` isn't partitioned. Each partition's bound expression is
/// `FOR VALUES FROM ('<lower>') TO ('<upper>')`; we pull every expression then
/// parse the `TO ('<upper>')` value in Rust.
///
/// Postgres-specific (uses `pg_inherits` / `pg_get_expr`). Only ever reached
/// via `ensure_partition_lookahead`, which guards the postgres feature.
fn max_partition_upper_bound(connection: &StorageConnection) -> Result<i64, RepositoryError> {
    #[derive(QueryableByName)]
    struct BoundExpr {
        #[diesel(sql_type = Text)]
        bound: String,
    }

    let bounds: Vec<BoundExpr> = diesel::sql_query(
        r#"
        SELECT pg_get_expr(c.relpartbound, c.oid) AS bound
        FROM pg_inherits i
        JOIN pg_class c ON c.oid = i.inhrelid
        WHERE i.inhparent = 'changelog'::regclass
        "#,
    )
    .get_results(connection.lock().connection())?;

    let max_upper = bounds
        .into_iter()
        .filter_map(|b| parse_upper_bound(&b.bound))
        .max()
        .unwrap_or(0);

    Ok(max_upper)
}

#[derive(QueryableByName)]
struct DefaultPartitionStats {
    #[diesel(sql_type = BigInt)]
    count: i64,
    #[diesel(sql_type = Nullable<BigInt>)]
    max: Option<i64>,
}

/// Row count and highest cursor in the DEFAULT partition.
fn default_partition_stats(
    connection: &StorageConnection,
) -> Result<DefaultPartitionStats, RepositoryError> {
    let stats = diesel::sql_query(format!(
        "SELECT count(*)::bigint AS count, max(cursor) AS max FROM {DEFAULT_PARTITION}"
    ))
    .get_result(connection.lock().connection())?;
    Ok(stats)
}

/// Extract the upper bound `N` from a partition bound expression of the shape
/// `FOR VALUES FROM ('<lower>') TO ('<upper>')`. Returns `None` if the input
/// doesn't match or the number doesn't parse (including the `DEFAULT` bound).
fn parse_upper_bound(expr: &str) -> Option<i64> {
    let (_, after_to) = expr.rsplit_once("TO (")?;
    let (number, _) = after_to.split_once(')')?;
    number.trim().trim_matches('\'').parse().ok()
}

#[cfg(all(test, feature = "postgres"))]
mod tests {
    use super::{
        attach_range_partition, create_standalone_partition_table, ensure_partition_lookahead,
        parse_upper_bound, PartitionTopUp, DEFAULT_PARTITION,
    };
    use crate::{
        migrations::ChangelogPartitionConfig, mock::MockDataInserts, test_db, ChangeLogInsertRow,
        ChangelogRepository, ChangelogTableName, StorageConnection, StorageConnectionManager,
    };
    use diesel::{
        prelude::*,
        sql_types::{BigInt, Text},
    };
    use std::{
        sync::mpsc,
        thread,
        time::{Duration, Instant},
    };

    #[derive(QueryableByName)]
    struct Bigint {
        #[diesel(sql_type = BigInt)]
        value: i64,
    }

    #[derive(QueryableByName)]
    struct TextValue {
        #[diesel(sql_type = Text)]
        value: String,
    }

    /// Feeds the parser real `pg_get_expr(relpartbound, ...)` output from a
    /// partitioned `changelog` so we're testing it against the exact string
    /// shape Postgres emits, not what we *think* it emits.
    #[actix_rt::test]
    async fn parse_upper_bound_extracts_number_from_pg_expr() {
        let (_, connection, _, _) = test_db::setup_all(
            "parse_upper_bound_extracts_from_pg",
            MockDataInserts::none(),
        )
        .await;

        reset_to_tight_partition_layout(&connection);

        #[derive(QueryableByName)]
        struct BoundExpr {
            #[diesel(sql_type = Text)]
            bound: String,
        }

        let mut upper_bounds: Vec<i64> = diesel::sql_query(
            r#"
            SELECT pg_get_expr(c.relpartbound, c.oid) AS bound
            FROM pg_inherits i
            JOIN pg_class c ON c.oid = i.inhrelid
            WHERE i.inhparent = 'changelog'::regclass
            "#,
        )
        .get_results::<BoundExpr>(connection.lock().connection())
        .unwrap()
        .into_iter()
        .filter_map(|b| parse_upper_bound(&b.bound))
        .collect();
        upper_bounds.sort();

        // Tight layout = [1,3) and [3,5) → upper bounds 3 and 5.
        assert_eq!(upper_bounds, vec![3, 5]);

        // Defensive cases — inputs the parser must reject without panicking.
        assert_eq!(parse_upper_bound("DEFAULT"), None);
        assert_eq!(parse_upper_bound(""), None);
    }

    /// 4 pre-seeded rows (cursors 1..=4) on a starting layout of two
    /// partitions [1,3), [3,5). With size=2, lookahead=4:
    /// target_headroom = 4, actual = max_upper(5) - max_cursor(4) = 1, so
    /// ensure_partition_lookahead must create 2 new partitions (p_5, p_7) to
    /// restore headroom.
    #[actix_rt::test]
    async fn test_ensure_partition_lookahead_creates_partitions() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_ensure_partition_lookahead_creates",
            MockDataInserts::none(),
        )
        .await;

        reset_to_tight_partition_layout(&connection);
        seed_four_rows(&connection);

        let config = ChangelogPartitionConfig {
            partition_size: 2,
            lookahead: 4,
        };
        let created = ensure_partition_lookahead(&connection, &config).unwrap();

        assert_eq!(
            created,
            PartitionTopUp::Created {
                partitions: 2,
                overflow_rows: 0
            }
        );
        // p_1, p_3 (initial) + p_5, p_7 (created) = 4
        assert_eq!(count_range_partitions(&connection), 4);
    }

    /// Same tight starting layout but no rows. With size=2, lookahead=4:
    /// target_headroom = 4, actual = max_upper(5) - max_cursor(0) = 5, so
    /// ensure_partition_lookahead is a no-op and creates nothing. A reader on
    /// the DEFAULT must not cause a `LockedOut`.
    #[actix_rt::test]
    async fn test_ensure_partition_lookahead_noop_when_no_records() {
        let (_, connection, connection_manager, _) = test_db::setup_all(
            "test_ensure_partition_lookahead_noop",
            MockDataInserts::none(),
        )
        .await;

        reset_to_tight_partition_layout(&connection);
        let holder = hold_open_transaction(
            &connection_manager,
            "SELECT count(*) FROM changelog_p_default",
        );

        let config = ChangelogPartitionConfig {
            partition_size: 2,
            lookahead: 4,
        };
        let created = ensure_partition_lookahead(&connection, &config).unwrap();

        assert_eq!(
            created,
            PartitionTopUp::Created {
                partitions: 0,
                overflow_rows: 0
            }
        );
        holder.release();
        assert_eq!(count_range_partitions(&connection), 2);
    }

    /// Records exist but the partition layout already has enough headroom on
    /// top. With cursors 1..=2 and partitions [1,3), [3,5), [5,7), [7,9), and
    /// lookahead=4: target_headroom = 4, actual = max_upper(9) -
    /// max_cursor(2) = 7, so ensure_partition_lookahead is a no-op even
    /// though the table is non-empty.
    #[actix_rt::test]
    async fn test_ensure_partition_lookahead_noop_when_records_have_enough_headroom() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_ensure_partition_lookahead_noop_with_records",
            MockDataInserts::none(),
        )
        .await;

        reset_to_tight_partition_layout(&connection);
        // Extend headroom on top of the tight base by adding two more partitions.
        for (lower, upper) in [(5, 7), (7, 9)] {
            diesel::sql_query(format!(
                "CREATE TABLE changelog_p_{} PARTITION OF changelog FOR VALUES FROM ({}) TO ({});",
                lower, lower, upper
            ))
            .execute(connection.lock().connection())
            .unwrap();
        }

        diesel::sql_query(
            "INSERT INTO changelog (cursor, table_name, record_id, row_action) VALUES \
                 (1, 'invoice', 'r1', 'UPSERT'), \
                 (2, 'invoice', 'r2', 'UPSERT')",
        )
        .execute(connection.lock().connection())
        .unwrap();
        diesel::sql_query("SELECT setval('changelog_cursor_seq', 2)")
            .execute(connection.lock().connection())
            .unwrap();

        let config = ChangelogPartitionConfig {
            partition_size: 2,
            lookahead: 4,
        };
        let created = ensure_partition_lookahead(&connection, &config).unwrap();

        assert_eq!(
            created,
            PartitionTopUp::Created {
                partitions: 0,
                overflow_rows: 0
            }
        );
        assert_eq!(count_range_partitions(&connection), 4);
    }

    /// The create-and-attach helper must leave the partition indistinguishable
    /// from one made with `CREATE TABLE … PARTITION OF`: bound as requested,
    /// exactly one index which is the PK and hangs off `changelog_pkey`, and a
    /// working `nextval` default so an insert without a cursor routes to it.
    #[actix_rt::test]
    async fn create_partition_attaches_with_adopted_pk_index() {
        let (_, connection, _, _) =
            test_db::setup_all("create_partition_adopted_pk", MockDataInserts::none()).await;

        reset_to_tight_partition_layout(&connection);
        create_standalone_partition_table(&connection, 5).unwrap();
        attach_range_partition(&connection, 5, 7).unwrap();

        // Bound is what we asked for.
        let bound: String = diesel::sql_query(
            "SELECT pg_get_expr(relpartbound, oid) AS value FROM pg_class \
             WHERE relname = 'changelog_p_5'",
        )
        .get_result::<TextValue>(connection.lock().connection())
        .unwrap()
        .value;
        assert_eq!(bound, "FOR VALUES FROM ('5') TO ('7')");

        // The copied PK index was adopted as a leg of the parent's partitioned
        // PK rather than left standalone.
        assert!(partition_pk_is_attached_to_parent(
            &connection,
            "changelog_p_5"
        ));

        // Sequence default copied: cursor 5 is the next value after the tight
        // layout's reset, so a cursor-less insert must land in the new partition.
        diesel::sql_query("SELECT setval('changelog_cursor_seq', 4)")
            .execute(connection.lock().connection())
            .unwrap();
        insert_row(&connection, "routes");
        assert_eq!(partition_holding(&connection, "routes"), "changelog_p_5");
    }

    /// Cursors 5, 6 and 8 have spilled on a layout ending at 5. With size=2,
    /// lookahead=4, sequence 8: [5,7) takes 5 and 6, [7,9) takes 8, then
    /// [9,11) and [11,13) restore headroom. DEFAULT ends empty, cursors kept.
    #[actix_rt::test]
    async fn repair_moves_default_rows_into_range_partitions_then_tops_up() {
        let (_, connection, _, _) =
            test_db::setup_all("repair_moves_default_rows", MockDataInserts::none()).await;

        reset_to_tight_partition_layout(&connection);
        seed_four_rows(&connection);

        diesel::sql_query(
            "INSERT INTO changelog (cursor, table_name, record_id, row_action) VALUES \
                 (5, 'invoice', 'o5', 'UPSERT'), \
                 (6, 'invoice', 'o6', 'UPSERT'), \
                 (8, 'invoice', 'o8', 'DELETE')",
        )
        .execute(connection.lock().connection())
        .unwrap();
        diesel::sql_query("SELECT setval('changelog_cursor_seq', 8)")
            .execute(connection.lock().connection())
            .unwrap();
        assert_eq!(default_partition_count(&connection), 3);

        let config = ChangelogPartitionConfig {
            partition_size: 2,
            lookahead: 4,
        };
        let outcome = ensure_partition_lookahead(&connection, &config).unwrap();

        assert_eq!(
            outcome,
            PartitionTopUp::Created {
                partitions: 4,
                overflow_rows: 3
            }
        );
        assert_eq!(default_partition_count(&connection), 0);
        // p_1, p_3 (initial) + p_5, p_7 (repair) + p_9, p_11 (top-up) = 6.
        assert_eq!(count_range_partitions(&connection), 6);

        assert_eq!(partition_holding(&connection, "o5"), "changelog_p_5");
        assert_eq!(partition_holding(&connection, "o6"), "changelog_p_5");
        assert_eq!(partition_holding(&connection, "o8"), "changelog_p_7");
        assert_eq!(cursor_of(&connection, "o5"), 5);
        assert_eq!(cursor_of(&connection, "o6"), 6);
        assert_eq!(cursor_of(&connection, "o8"), 8);

        // The repaired partitions are real partitions: PK legs adopted.
        assert!(partition_pk_is_attached_to_parent(
            &connection,
            "changelog_p_5"
        ));
        assert!(partition_pk_is_attached_to_parent(
            &connection,
            "changelog_p_7"
        ));

        // Nothing lost overall: 4 seeded + 3 overflow.
        let total: i64 = diesel::sql_query("SELECT count(*)::bigint AS value FROM changelog")
            .get_result::<Bigint>(connection.lock().connection())
            .unwrap()
            .value;
        assert_eq!(total, 7);
    }

    /// Cursors 5, 6 and 8 have spilled and something holds a lock that
    /// conflicts with ATTACH PARTITION. The first range must give up at the
    /// lock timeout and roll back: nothing attached, rows still in the DEFAULT.
    /// Once released, the next call repairs and tops up.
    #[actix_rt::test]
    async fn repair_locked_out_rolls_back_range_then_completes_next_call() {
        let (_, connection, connection_manager, _) =
            test_db::setup_all("repair_locked_out_rolls_back", MockDataInserts::none()).await;

        reset_to_tight_partition_layout(&connection);
        seed_four_rows(&connection);
        diesel::sql_query(
            "INSERT INTO changelog (cursor, table_name, record_id, row_action) VALUES \
                 (5, 'invoice', 'o5', 'UPSERT'), \
                 (6, 'invoice', 'o6', 'UPSERT'), \
                 (8, 'invoice', 'o8', 'DELETE')",
        )
        .execute(connection.lock().connection())
        .unwrap();
        diesel::sql_query("SELECT setval('changelog_cursor_seq', 8)")
            .execute(connection.lock().connection())
            .unwrap();

        let holder = hold_open_transaction(
            &connection_manager,
            "LOCK TABLE changelog IN SHARE UPDATE EXCLUSIVE MODE",
        );

        let config = ChangelogPartitionConfig {
            partition_size: 2,
            lookahead: 4,
        };
        let started = Instant::now();
        let outcome = ensure_partition_lookahead(&connection, &config).unwrap();
        let waited = started.elapsed();

        // Top bound still 5, sequence 8. Rows found but none moved.
        assert_eq!(
            outcome,
            PartitionTopUp::LockedOut {
                headroom: -3,
                created: 0,
                overflow_rows: 3
            }
        );
        assert!(
            waited < Duration::from_secs(10),
            "repair waited {:?}; lock_timeout did not fire",
            waited
        );
        // The failed range's standalone table was rolled back with it.
        assert_eq!(count_range_partitions(&connection), 2);
        assert_eq!(default_partition_count(&connection), 3);
        let orphan_tables: i64 = diesel::sql_query(
            "SELECT count(*)::bigint AS value FROM pg_class \
             WHERE relname = 'changelog_p_5' AND relkind = 'r'",
        )
        .get_result::<Bigint>(connection.lock().connection())
        .unwrap()
        .value;
        assert_eq!(orphan_tables, 0);

        holder.release();

        let outcome = ensure_partition_lookahead(&connection, &config).unwrap();
        assert_eq!(
            outcome,
            PartitionTopUp::Created {
                partitions: 4,
                overflow_rows: 3
            }
        );
        assert_eq!(default_partition_count(&connection), 0);
        assert_eq!(count_range_partitions(&connection), 6);
    }

    /// Another session holds an open transaction that has
    /// inserted into `changelog` (ROW EXCLUSIVE, as a long sync integration
    /// does). The top-up must still complete, and a third session's insert
    /// must not queue behind it.
    ///
    /// With `CREATE TABLE … PARTITION OF` this test hangs: the DDL needs
    /// ACCESS EXCLUSIVE, waits on the open transaction, and the third insert
    /// waits behind the DDL. The 10 s guards turn that hang into a failure.
    #[actix_rt::test]
    async fn test_ensure_partition_lookahead_not_blocked_by_open_insert_transaction() {
        let (_, connection, connection_manager, _) = test_db::setup_all(
            "test_ensure_partition_lookahead_not_blocked",
            MockDataInserts::none(),
        )
        .await;

        reset_to_tight_partition_layout(&connection);
        // Cursors 1..=2 so the two inserts below (cursors 3 and 4) land in the
        // existing [3,5) partition.
        diesel::sql_query(
            "INSERT INTO changelog (cursor, table_name, record_id, row_action) VALUES \
                 (1, 'invoice', 'r1', 'UPSERT'), \
                 (2, 'invoice', 'r2', 'UPSERT')",
        )
        .execute(connection.lock().connection())
        .unwrap();
        diesel::sql_query("SELECT setval('changelog_cursor_seq', 2)")
            .execute(connection.lock().connection())
            .unwrap();

        // Session A: open transaction holding ROW EXCLUSIVE on changelog.
        let holder = hold_open_transaction(
            &connection_manager,
            "INSERT INTO changelog (table_name, record_id, row_action) \
             VALUES ('unit', 'held-open', 'UPSERT')",
        );

        // Session B: the top-up. Must finish while A is still open. A's insert
        // took cursor 3, so headroom = 5 - 3 = 2 < 4: one partition [5,7)
        // brings it to 4.
        let config = ChangelogPartitionConfig {
            partition_size: 2,
            lookahead: 4,
        };
        let top_up_connection = connection_manager.connection().unwrap();
        let top_up = run_with_timeout(move || {
            ensure_partition_lookahead(&top_up_connection, &config).unwrap()
        });
        assert_eq!(
            top_up,
            PartitionTopUp::Created {
                partitions: 1,
                overflow_rows: 0
            }
        );

        // Session C: an ordinary insert while A is still open. Must not wait.
        let insert_connection = connection_manager.connection().unwrap();
        run_with_timeout(move || {
            diesel::sql_query(
                "INSERT INTO changelog (table_name, record_id, row_action) \
                 VALUES ('unit', 'concurrent', 'UPSERT')",
            )
            .execute(insert_connection.lock().connection())
            .unwrap();
        });

        holder.release();
        assert_eq!(count_range_partitions(&connection), 3);
    }

    /// An open transaction has inserted past the top partition: its row sits
    /// uncommitted in the DEFAULT and it holds ROW EXCLUSIVE there, which
    /// blocks the ACCESS EXCLUSIVE an attach needs. The top-up must report
    /// `LockedOut` rather than wait, while inserts keep landing in the DEFAULT.
    /// Once it commits, the next call repairs and tops up.
    #[actix_rt::test]
    async fn test_ensure_partition_lookahead_locked_out_by_open_overflow_transaction_then_repairs()
    {
        let (_, connection, connection_manager, _) = test_db::setup_all(
            "test_ensure_partition_lookahead_locked_out_overflow",
            MockDataInserts::none(),
        )
        .await;

        reset_to_tight_partition_layout(&connection);
        seed_four_rows(&connection);

        // Session A: takes cursor 5, which no range partition covers → DEFAULT.
        let holder = hold_open_transaction(
            &connection_manager,
            "INSERT INTO changelog (table_name, record_id, row_action) \
             VALUES ('unit', 'spilled', 'UPSERT')",
        );

        // Session B: another overflow insert while A is open. Must not fail
        // or wait on A.
        let insert_connection = connection_manager.connection().unwrap();
        run_with_timeout(move || insert_row(&insert_connection, "spilled-too"));
        assert_eq!(
            partition_holding(&connection, "spilled-too"),
            DEFAULT_PARTITION
        );

        let config = ChangelogPartitionConfig {
            partition_size: 2,
            lookahead: 4,
        };
        let started = Instant::now();
        let outcome = ensure_partition_lookahead(&connection, &config).unwrap();
        let waited = started.elapsed();

        // Sequence is at 6 (two overflow inserts), top bound 5: headroom -1.
        // Only B's row is committed and visible, so one overflow row is found.
        assert_eq!(
            outcome,
            PartitionTopUp::LockedOut {
                headroom: -1,
                created: 0,
                overflow_rows: 1
            }
        );
        assert!(
            waited < Duration::from_secs(10),
            "top-up waited {:?}; lock_timeout did not fire",
            waited
        );
        // Rolled back: nothing attached, nothing moved.
        assert_eq!(count_range_partitions(&connection), 2);
        assert_eq!(default_partition_count(&connection), 1);

        holder.release();

        // A committed: both spilled rows (5, 6) are visible in the DEFAULT.
        assert_eq!(default_partition_count(&connection), 2);
        let outcome = ensure_partition_lookahead(&connection, &config).unwrap();
        // Repair: [5,7) takes both rows. Top-up: max_upper 7, sequence 6,
        // headroom 1 → [7,9), [9,11).
        assert_eq!(
            outcome,
            PartitionTopUp::Created {
                partitions: 3,
                overflow_rows: 2
            }
        );
        assert_eq!(default_partition_count(&connection), 0);
        assert_eq!(partition_holding(&connection, "spilled"), "changelog_p_5");
        assert_eq!(
            partition_holding(&connection, "spilled-too"),
            "changelog_p_5"
        );
        assert_eq!(count_range_partitions(&connection), 5);
    }

    /// Something holds a lock that does conflict with ATTACH PARTITION (SHARE
    /// UPDATE EXCLUSIVE — what VACUUM or CREATE INDEX CONCURRENTLY hold; it
    /// does not block the catalog reads). The top-up must give up after the
    /// lock timeout and report `LockedOut` rather than block the caller until
    /// the holder finishes — and the next call after the holder is gone must
    /// do the work.
    #[actix_rt::test]
    async fn test_ensure_partition_lookahead_locked_out_then_recovers() {
        let (_, connection, connection_manager, _) = test_db::setup_all(
            "test_ensure_partition_lookahead_locked_out",
            MockDataInserts::none(),
        )
        .await;

        reset_to_tight_partition_layout(&connection);
        seed_four_rows(&connection);

        let holder = hold_open_transaction(
            &connection_manager,
            "LOCK TABLE changelog IN SHARE UPDATE EXCLUSIVE MODE",
        );

        let config = ChangelogPartitionConfig {
            partition_size: 2,
            lookahead: 4,
        };
        let started = Instant::now();
        let outcome = ensure_partition_lookahead(&connection, &config).unwrap();
        let waited = started.elapsed();

        // headroom = max_upper(5) - max_cursor(4) = 1, nothing created.
        assert_eq!(
            outcome,
            PartitionTopUp::LockedOut {
                headroom: 1,
                created: 0,
                overflow_rows: 0
            }
        );
        // Bounded by the lock_timeout, not by the holder.
        assert!(
            waited < Duration::from_secs(10),
            "top-up waited {:?}; lock_timeout did not fire",
            waited
        );
        assert_eq!(count_range_partitions(&connection), 2);

        holder.release();

        let outcome = ensure_partition_lookahead(&connection, &config).unwrap();
        assert_eq!(
            outcome,
            PartitionTopUp::Created {
                partitions: 2,
                overflow_rows: 0
            }
        );
        assert_eq!(count_range_partitions(&connection), 4);
    }

    /// A holds a read lock on the DEFAULT; B's top-up queues behind A; C's
    /// tracked insert queues behind B, for no longer than the DEFAULT lock timeout.
    #[actix_rt::test]
    async fn test_tracked_insert_waits_behind_top_up_lock_request() {
        let (_, connection, connection_manager, _) = test_db::setup_all(
            "test_tracked_insert_waits_behind_top_up",
            MockDataInserts::none(),
        )
        .await;

        reset_to_tight_partition_layout(&connection);
        // Headroom 5 - 2 = 3 < 4; C's insert takes cursor 3, in [3,5).
        diesel::sql_query(
            "INSERT INTO changelog (cursor, table_name, record_id, row_action) VALUES \
                 (1, 'invoice', 'r1', 'UPSERT'), \
                 (2, 'invoice', 'r2', 'UPSERT')",
        )
        .execute(connection.lock().connection())
        .unwrap();
        diesel::sql_query("SELECT setval('changelog_cursor_seq', 2)")
            .execute(connection.lock().connection())
            .unwrap();

        let holder =
            hold_open_transaction(&connection_manager, "SELECT max(cursor) FROM changelog");

        let config = ChangelogPartitionConfig {
            partition_size: 2,
            lookahead: 4,
        };
        let top_up_connection = connection_manager.connection().unwrap();
        let top_up =
            thread::spawn(move || ensure_partition_lookahead(&top_up_connection, &config).unwrap());
        // Let B's lock request reach the queue before C starts.
        thread::sleep(Duration::from_millis(200));

        let insert_connection = connection_manager.connection().unwrap();
        let waited = run_with_timeout(move || {
            let started = Instant::now();
            insert_connection
                .transaction_sync(|connection| {
                    ChangelogRepository::new(connection).insert(&ChangeLogInsertRow {
                        table_name: ChangelogTableName::Invoice,
                        record_id: "tracked".to_string(),
                        ..Default::default()
                    })
                })
                .unwrap();
            started.elapsed()
        });
        // Twice the 500ms DEFAULT lock timeout, so a slow runner doesn't flake.
        assert!(
            waited < Duration::from_secs(1),
            "tracked insert waited {:?}",
            waited
        );

        assert_eq!(
            top_up.join().unwrap(),
            PartitionTopUp::LockedOut {
                headroom: 3,
                created: 0,
                overflow_rows: 0
            }
        );
        holder.release();
    }

    /// Drop existing partitions, recreate two small ones [1,3), [3,5) plus the
    /// DEFAULT, and reset the sequence so `max_sequence` matches the empty
    /// changelog.
    fn reset_to_tight_partition_layout(connection: &StorageConnection) {
        diesel::sql_query(
            r#"
            DO $$
            DECLARE part RECORD;
            BEGIN
                FOR part IN
                    SELECT inhrelid::regclass::text AS partname
                    FROM pg_inherits
                    WHERE inhparent = 'changelog'::regclass
                LOOP
                    EXECUTE format('DROP TABLE %s', part.partname);
                END LOOP;
            END $$;
            "#,
        )
        .execute(connection.lock().connection())
        .unwrap();

        diesel::sql_query(
            "CREATE TABLE changelog_p_1 PARTITION OF changelog FOR VALUES FROM (1) TO (3);",
        )
        .execute(connection.lock().connection())
        .unwrap();
        diesel::sql_query(
            "CREATE TABLE changelog_p_3 PARTITION OF changelog FOR VALUES FROM (3) TO (5);",
        )
        .execute(connection.lock().connection())
        .unwrap();
        // Same statement the 3.03.00 migration fragment uses.
        diesel::sql_query(format!(
            "CREATE TABLE {DEFAULT_PARTITION} PARTITION OF changelog DEFAULT"
        ))
        .execute(connection.lock().connection())
        .unwrap();

        diesel::sql_query("SELECT setval('changelog_cursor_seq', 1, false)")
            .execute(connection.lock().connection())
            .unwrap();
    }

    /// Range partitions only; the DEFAULT is always present in the tight layout.
    fn count_range_partitions(connection: &StorageConnection) -> i64 {
        diesel::sql_query(
            "SELECT count(*)::bigint AS value FROM pg_inherits i \
             JOIN pg_class c ON c.oid = i.inhrelid \
             WHERE i.inhparent = 'changelog'::regclass \
               AND pg_get_expr(c.relpartbound, c.oid) <> 'DEFAULT'",
        )
        .get_result::<Bigint>(connection.lock().connection())
        .unwrap()
        .value
    }

    fn default_partition_count(connection: &StorageConnection) -> i64 {
        diesel::sql_query(format!(
            "SELECT count(*)::bigint AS value FROM {DEFAULT_PARTITION}"
        ))
        .get_result::<Bigint>(connection.lock().connection())
        .unwrap()
        .value
    }

    /// Cursors 1..=4 with the sequence aligned to match.
    fn seed_four_rows(connection: &StorageConnection) {
        diesel::sql_query(
            "INSERT INTO changelog (cursor, table_name, record_id, row_action) VALUES \
                 (1, 'invoice',     'r1', 'UPSERT'), \
                 (2, 'requisition', 'r2', 'UPSERT'), \
                 (3, 'invoice',     'r3', 'DELETE'), \
                 (4, 'stocktake',   'r4', 'DELETE')",
        )
        .execute(connection.lock().connection())
        .unwrap();
        diesel::sql_query("SELECT setval('changelog_cursor_seq', 4)")
            .execute(connection.lock().connection())
            .unwrap();
    }

    /// Insert without an explicit cursor; routed by the next sequence value.
    fn insert_row(connection: &StorageConnection, record_id: &str) {
        diesel::sql_query(format!(
            "INSERT INTO changelog (table_name, record_id, row_action) \
             VALUES ('unit', '{record_id}', 'UPSERT')"
        ))
        .execute(connection.lock().connection())
        .unwrap();
    }

    /// Which partition physically holds the row with this record_id.
    fn partition_holding(connection: &StorageConnection, record_id: &str) -> String {
        diesel::sql_query(format!(
            "SELECT tableoid::regclass::text AS value FROM changelog WHERE record_id = '{record_id}'"
        ))
        .get_result::<TextValue>(connection.lock().connection())
        .unwrap()
        .value
    }

    fn cursor_of(connection: &StorageConnection, record_id: &str) -> i64 {
        diesel::sql_query(format!(
            "SELECT cursor AS value FROM changelog WHERE record_id = '{record_id}'"
        ))
        .get_result::<Bigint>(connection.lock().connection())
        .unwrap()
        .value
    }

    /// True if the partition's PK index is a child of `changelog_pkey`, i.e.
    /// Postgres adopted it on attach rather than the partition carrying a
    /// standalone index (or none).
    fn partition_pk_is_attached_to_parent(connection: &StorageConnection, partition: &str) -> bool {
        diesel::sql_query(format!(
            "SELECT count(*)::bigint AS value FROM pg_inherits i \
             JOIN pg_index x ON x.indexrelid = i.inhrelid \
             WHERE i.inhparent = 'changelog_pkey'::regclass \
               AND x.indrelid = '{partition}'::regclass AND x.indisprimary"
        ))
        .get_result::<Bigint>(connection.lock().connection())
        .unwrap()
        .value
            == 1
    }

    /// A second session that runs `statement` inside a transaction and keeps
    /// it open until `release()` — the stand-in for a long integration
    /// transaction or any other lock holder.
    struct OpenTransaction {
        release: mpsc::Sender<()>,
        handle: thread::JoinHandle<()>,
    }

    impl OpenTransaction {
        fn release(self) {
            let _ = self.release.send(());
            self.handle.join().unwrap();
        }
    }

    fn hold_open_transaction(
        connection_manager: &StorageConnectionManager,
        statement: &'static str,
    ) -> OpenTransaction {
        let holder = connection_manager.connection().unwrap();
        let (ready_tx, ready_rx) = mpsc::channel();
        let (release_tx, release_rx) = mpsc::channel::<()>();
        let handle = thread::spawn(move || {
            holder
                .transaction_sync(|connection| {
                    diesel::sql_query(statement)
                        .execute(connection.lock().connection())
                        .unwrap();
                    ready_tx.send(()).unwrap();
                    // Hold the transaction (and its locks) until released.
                    let _ = release_rx.recv();
                    Ok::<(), crate::RepositoryError>(())
                })
                .unwrap();
        });
        ready_rx
            .recv_timeout(Duration::from_secs(10))
            .expect("holder transaction did not start");
        OpenTransaction {
            release: release_tx,
            handle,
        }
    }

    /// Run blocking work on its own thread and fail the test if it has not
    /// finished in 10 s — a hang is the failure mode under test.
    fn run_with_timeout<T: Send + 'static>(work: impl FnOnce() -> T + Send + 'static) -> T {
        let (tx, rx) = mpsc::channel();
        thread::spawn(move || {
            let _ = tx.send(work());
        });
        rx.recv_timeout(Duration::from_secs(10))
            .expect("blocked for over 10 s — a lock is queued behind the partition top-up")
    }
}
