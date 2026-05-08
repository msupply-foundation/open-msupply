#[cfg(feature = "postgres")]
use crate::{migrations::ChangelogPartitionConfig, RepositoryError, StorageConnection};
#[cfg(feature = "postgres")]
use diesel::{prelude::*, sql_types::BigInt};

/// Ensure enough future cursor-range partitions exist on `changelog` to keep
/// `lookahead_partitions * partition_size` rows of headroom above `max(cursor)`.
///
/// Postgres feature only - does nothing if `changelog` isn't partitioned. Idempotent.
/// Returns the number of partitions created.
#[cfg(feature = "postgres")]
pub fn ensure_partition_lookahead(
    connection: &StorageConnection,
    config: &ChangelogPartitionConfig,
) -> Result<usize, RepositoryError> {
    #[derive(QueryableByName)]
    struct Bigint {
        #[diesel(sql_type = BigInt)]
        value: i64,
    }

    // Highest upper bound across `changelog`'s partitions. Each partition's bound
    // expression looks like `FOR VALUES FROM ('1') TO ('5000001')` — extract the
    // upper number with `substring … FROM '…'` (returns the captured group as text).
    // Returns 0 if `changelog` isn't partitioned or has no children.
    let max_upper = diesel::sql_query(
        r#"
        SELECT COALESCE(max(substring(pg_get_expr(c.relpartbound, c.oid) FROM 'TO \(''(\d+)''\)')::bigint), 0) AS value
        FROM pg_inherits i
        JOIN pg_class c ON c.oid = i.inhrelid
        WHERE i.inhparent = 'changelog'::regclass
        "#,
    )
    .get_result::<Bigint>(connection.lock().connection())?
    .value;

    if max_upper == 0 {
        // `changelog` isn't partitioned (pre-migration) or has no partitions —
        // should not reach this state. Should we panic or throw error instead? For now, just log and return.
        log::warn!("changelog partition lookahead: changelog table is not partitioned or has no partitions");
        return Ok(0);
    }

    let current_max =
        diesel::sql_query("SELECT COALESCE(max(cursor), 0)::bigint AS value FROM changelog")
            .get_result::<Bigint>(connection.lock().connection())?
            .value;

    let size = config.partition_size;
    let lookahead = config.lookahead_partitions;
    let target_headroom = lookahead * size;

    let mut created = 0;
    let mut next_lower = max_upper;
    // Create partitions until we have enough headroom above the current max cursor
    while next_lower - current_max < target_headroom {
        let next_upper = next_lower + size;
        let sql = format!(
            "CREATE TABLE changelog_p_{} PARTITION OF changelog \
             FOR VALUES FROM ({}) TO ({})",
            next_lower, next_lower, next_upper
        );
        diesel::sql_query(&sql).execute(connection.lock().connection())?;
        log::info!(
            "changelog partition created changelog_p_{} [{}..{})",
            next_lower,
            next_lower,
            next_upper
        );
        next_lower = next_upper;
        created += 1;
    }

    Ok(created)
}

#[cfg(all(test, feature = "postgres"))]
mod tests {
    use super::ensure_partition_lookahead;
    use crate::{
        migrations::ChangelogPartitionConfig, mock::MockDataInserts, test_db, StorageConnection,
    };
    use diesel::{prelude::*, sql_types::BigInt};

    /// 4 pre-seeded rows (cursors 1..=4) on a starting layout of two
    /// partitions [1,3), [3,5). With size=2, lookahead=2:
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

        diesel::sql_query(
            "INSERT INTO changelog (cursor, table_name, record_id, row_action) VALUES \
                 (1, 'invoice',     'r1', 'UPSERT'), \
                 (2, 'requisition', 'r2', 'UPSERT'), \
                 (3, 'invoice',     'r3', 'DELETE'), \
                 (4, 'stocktake',   'r4', 'DELETE')",
        )
        .execute(connection.lock().connection())
        .unwrap();

        let config = ChangelogPartitionConfig {
            partition_size: 2,
            lookahead_partitions: 2,
        };
        let created = ensure_partition_lookahead(&connection, &config).unwrap();

        assert_eq!(created, 2);
        // p_1, p_3 (initial) + p_5, p_7 (created) = 4
        assert_eq!(count_partitions(&connection), 4);
    }

    /// Same tight starting layout but no rows. With size=2, lookahead=2:
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
            lookahead_partitions: 2,
        };
        let created = ensure_partition_lookahead(&connection, &config).unwrap();

        assert_eq!(created, 0);
        assert_eq!(count_partitions(&connection), 2);
    }

    /// Records exist but the partition layout already has enough headroom on
    /// top. With cursors 1..=2 and partitions [1,3), [3,5), [5,7), [7,9):
    /// target_headroom = 4, actual = max_upper(9) - max_cursor(2) = 7, so
    /// ensure_partition_lookahead is a no-op even though the table is non-empty.
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

        let config = ChangelogPartitionConfig {
            partition_size: 2,
            lookahead_partitions: 2,
        };
        let created = ensure_partition_lookahead(&connection, &config).unwrap();

        assert_eq!(created, 0);
        assert_eq!(count_partitions(&connection), 4);
    }

    /// Drop changelog's existing partitions (and their rows) and recreate just
    /// two small ones [1,3), [3,5). Used to put the table into a known tight
    /// state so the headroom math is easy to verify.
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
    }

    fn count_partitions(connection: &StorageConnection) -> i64 {
        #[derive(QueryableByName)]
        struct Bigint {
            #[diesel(sql_type = BigInt)]
            value: i64,
        }
        diesel::sql_query(
            "SELECT count(*)::bigint AS value FROM pg_inherits \
             WHERE inhparent = 'changelog'::regclass",
        )
        .get_result::<Bigint>(connection.lock().connection())
        .unwrap()
        .value
    }
}
