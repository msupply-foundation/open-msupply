use crate::{
    migrations::{helpers::max_sequence, ChangelogPartitionConfig},
    RepositoryError, StorageConnection,
};
use diesel::{prelude::*, sql_types::Text};

/// Outcome of one [`ensure_partition_lookahead`] call.
#[derive(Debug, PartialEq, Eq)]
pub enum PartitionTopUp {
    /// Every partition needed to restore the lookahead was created
    /// (`Created(0)` means headroom was already sufficient).
    Created(usize),
    /// The tick hit the 2 s lock timeout. `created` partitions were committed
    /// before the one that timed out; `headroom` is how many cursor values
    /// remain insertable above `max(cursor)`. Retry on the next tick.
    LockedOut { headroom: i64, created: usize },
}

/// Create `changelog_p_<lower>` covering `[lower, upper)` and attach it to
/// `changelog`.
///
/// Two statements on purpose: `CREATE TABLE … PARTITION OF` takes `ACCESS
/// EXCLUSIVE` on `changelog` and blocks inserts. `INCLUDING ALL` copies the PK
/// index for Postgres to adopt on attach; do not trim it.
fn create_partition(
    connection: &StorageConnection,
    lower: i64,
    upper: i64,
) -> Result<(), RepositoryError> {
    diesel::sql_query(format!(
        "CREATE TABLE changelog_p_{lower} (LIKE changelog INCLUDING ALL)"
    ))
    .execute(connection.lock().connection())?;
    diesel::sql_query(format!(
        "ALTER TABLE changelog ATTACH PARTITION changelog_p_{lower} \
         FOR VALUES FROM ({lower}) TO ({upper})"
    ))
    .execute(connection.lock().connection())?;
    Ok(())
}

/// Ensure enough future cursor-range partitions exist on `changelog` to keep
/// `config.lookahead` cursor records of empty headroom above `max(cursor)`.
///
/// Each partition is created in its own transaction under a 2 s `lock_timeout`
/// (the catalog reads too: `pg_get_expr` takes a read lock on each partition).
/// A DDL timeout yields [`PartitionTopUp::LockedOut`]; a read timeout is an
/// ordinary error.
///
/// Postgres-only behaviour. Under SQLite the function returns immediately —
/// SQLite has no partitions to top up.
pub fn ensure_partition_lookahead(
    connection: &StorageConnection,
    config: &ChangelogPartitionConfig,
) -> Result<PartitionTopUp, RepositoryError> {
    if !cfg!(feature = "postgres") {
        return Ok(PartitionTopUp::Created(0));
    }

    let (max_upper, current_max) = connection
        .transaction_sync(|connection| {
            set_lock_timeout(connection)?;
            Ok::<_, RepositoryError>((
                max_partition_upper_bound(connection)?,
                max_sequence(connection)?,
            ))
        })
        .map_err(|e| e.to_inner_error())?;

    if max_upper == 0 {
        // `changelog` isn't partitioned (pre-migration) or has no partitions —
        // should not reach this state. Should we panic or throw error instead? For now, just log and return.
        log::warn!("changelog partition lookahead: changelog table is not partitioned or has no partitions");
        return Ok(PartitionTopUp::Created(0));
    }

    let size = config.partition_size;
    let target_headroom = config.lookahead;

    let mut created = 0;
    let mut next_lower = max_upper;
    // Create partitions until we have enough headroom above the current max cursor
    while next_lower - current_max < target_headroom {
        let next_upper = next_lower + size;
        let result = connection.transaction_sync(|connection| {
            set_lock_timeout(connection)?;
            create_partition(connection, next_lower, next_upper)
        });
        if let Err(error) = result {
            let error = error.to_inner_error();
            return if is_lock_timeout(&error) {
                Ok(PartitionTopUp::LockedOut {
                    headroom: next_lower - current_max,
                    created,
                })
            } else {
                Err(error)
            };
        }
        log::info!(
            "changelog partition created changelog_p_{} [{}..{})",
            next_lower,
            next_lower,
            next_upper
        );
        next_lower = next_upper;
        created += 1;
    }

    Ok(PartitionTopUp::Created(created))
}

/// `SET LOCAL`: the timeout ends with the current transaction.
fn set_lock_timeout(connection: &StorageConnection) -> Result<(), RepositoryError> {
    diesel::sql_query("SET LOCAL lock_timeout = '2s'").execute(connection.lock().connection())?;
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

/// Extract the upper bound `N` from a partition bound expression of the shape
/// `FOR VALUES FROM ('<lower>') TO ('<upper>')`. Returns `None` if the input
/// doesn't match or the number doesn't parse.
fn parse_upper_bound(expr: &str) -> Option<i64> {
    let (_, after_to) = expr.rsplit_once("TO (")?;
    let (number, _) = after_to.split_once(')')?;
    number.trim().trim_matches('\'').parse().ok()
}

#[cfg(all(test, feature = "postgres"))]
mod tests {
    use super::{create_partition, ensure_partition_lookahead, parse_upper_bound, PartitionTopUp};
    use crate::{
        migrations::ChangelogPartitionConfig, mock::MockDataInserts, test_db, StorageConnection,
        StorageConnectionManager,
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

        assert_eq!(created, PartitionTopUp::Created(2));
        // p_1, p_3 (initial) + p_5, p_7 (created) = 4
        assert_eq!(count_partitions(&connection), 4);
    }

    /// Same tight starting layout but no rows. With size=2, lookahead=4:
    /// target_headroom = 4, actual = max_upper(5) - max_cursor(0) = 5, so
    /// ensure_partition_lookahead is a no-op and creates nothing.
    #[actix_rt::test]
    async fn test_ensure_partition_lookahead_noop_when_no_records() {
        let (_, connection, _, _) = test_db::setup_all(
            "test_ensure_partition_lookahead_noop",
            MockDataInserts::none(),
        )
        .await;

        reset_to_tight_partition_layout(&connection);

        let config = ChangelogPartitionConfig {
            partition_size: 2,
            lookahead: 4,
        };
        let created = ensure_partition_lookahead(&connection, &config).unwrap();

        assert_eq!(created, PartitionTopUp::Created(0));
        assert_eq!(count_partitions(&connection), 2);
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

        assert_eq!(created, PartitionTopUp::Created(0));
        assert_eq!(count_partitions(&connection), 4);
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
        create_partition(&connection, 5, 7).unwrap();

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
        diesel::sql_query(
            "INSERT INTO changelog (table_name, record_id, row_action) \
             VALUES ('unit', 'routes', 'UPSERT')",
        )
        .execute(connection.lock().connection())
        .unwrap();
        let landed_in: String = diesel::sql_query(
            "SELECT tableoid::regclass::text AS value FROM changelog WHERE record_id = 'routes'",
        )
        .get_result::<TextValue>(connection.lock().connection())
        .unwrap()
        .value;
        assert_eq!(landed_in, "changelog_p_5");
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
        assert_eq!(top_up, PartitionTopUp::Created(1));

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
        assert_eq!(count_partitions(&connection), 3);
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
                created: 0
            }
        );
        // Bounded by the 2 s lock_timeout, not by the holder.
        assert!(
            waited < Duration::from_secs(10),
            "top-up waited {:?}; lock_timeout did not fire",
            waited
        );
        assert_eq!(count_partitions(&connection), 2);

        holder.release();

        let outcome = ensure_partition_lookahead(&connection, &config).unwrap();
        assert_eq!(outcome, PartitionTopUp::Created(2));
        assert_eq!(count_partitions(&connection), 4);
    }

    /// Drop existing partitions, recreate two small ones [1,3), [3,5), and
    /// reset the sequence so `max_sequence` matches the empty changelog.
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

        diesel::sql_query("SELECT setval('changelog_cursor_seq', 1, false)")
            .execute(connection.lock().connection())
            .unwrap();
    }

    fn count_partitions(connection: &StorageConnection) -> i64 {
        diesel::sql_query(
            "SELECT count(*)::bigint AS value FROM pg_inherits \
             WHERE inhparent = 'changelog'::regclass",
        )
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
