use crate::migrations::*;

#[cfg(feature = "postgres")]
use diesel::{prelude::*, sql_types::BigInt};

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "partition_changelog_by_cursor"
    }

    #[cfg(not(feature = "postgres"))]
    fn migrate_with_config(
        &self,
        connection: &StorageConnection,
        _config: &MigrationConfig,
    ) -> anyhow::Result<()> {
        // SQLite has no partitioning; Only rename patient_id to patient_link_id and update the index
        sql!(
            connection,
            r#"
            ALTER TABLE changelog RENAME COLUMN patient_id TO patient_link_id;
            DROP INDEX IF EXISTS index_changelog_patient_id;
            CREATE INDEX index_changelog_patient_link_id
                ON changelog (patient_link_id) WHERE patient_link_id IS NOT NULL;
            "#
        )?;
        Ok(())
    }

    #[cfg(feature = "postgres")]
    fn migrate_with_config(
        &self,
        connection: &StorageConnection,
        config: &MigrationConfig,
    ) -> anyhow::Result<()> {
        #[derive(QueryableByName)]
        struct MaxCursor {
            #[diesel(sql_type = BigInt)]
            max_cursor: i64,
        }

        let max_cursor: i64 = diesel::sql_query(
            "SELECT COALESCE(MAX(cursor), 0)::bigint AS max_cursor FROM changelog",
        )
        .get_result::<MaxCursor>(connection.lock().connection())?
        .max_cursor;

        let partition_size = config.changelog_partition.partition_size;
        let lookahead = config.changelog_partition.lookahead_partitions;

        // 1. Rename the existing changelog out of the way so the new partitioned
        //    table can reuse the `changelog` name.
        sql!(connection, "ALTER TABLE changelog RENAME TO old_changelog;")?;

        // 2. Drop the old table's constraints and indexes so the new partitioned
        //    table can reuse `changelog_pkey`, `changelog_name_link_id_fkey`, and
        //    `index_changelog_*`. The old table is dropped after the copy (step 7)
        //    so its indexes are about to disappear anyway.
        sql!(
            connection,
            r#"
            ALTER TABLE old_changelog DROP CONSTRAINT changelog_pkey;
            ALTER TABLE old_changelog DROP CONSTRAINT changelog_name_link_id_fkey;
            DROP INDEX IF EXISTS index_changelog_name_link_id_fkey;
            DROP INDEX IF EXISTS index_changelog_store_id_fkey;
            DROP INDEX IF EXISTS index_changelog_table_name;
            DROP INDEX IF EXISTS index_changelog_transfer_store_id;
            DROP INDEX IF EXISTS index_changelog_patient_id;
            "#
        )?;

        // 3. Detach the sequence so we can re-own it on the new changelog.
        sql!(
            connection,
            "ALTER SEQUENCE changelog_cursor_seq OWNED BY NONE;"
        )?;

        // 4. Create the fresh partitioned parent. Same column set + FK + PK.
        //    Secondary indexes are created AFTER the bulk INSERT (step 9) so PG
        //    builds them per-partition rather than maintaining them per row
        //    during the copy.
        sql!(
            connection,
            r#"
            CREATE TABLE changelog (
                cursor BIGINT NOT NULL DEFAULT nextval('changelog_cursor_seq'),
                table_name TEXT NOT NULL,
                record_id TEXT NOT NULL,
                row_action TEXT NOT NULL,
                name_link_id TEXT REFERENCES name_link(id),
                store_id TEXT,
                is_sync_update BOOLEAN NOT NULL DEFAULT FALSE,
                source_site_id INTEGER,
                transfer_store_id TEXT,
                patient_link_id TEXT,
                PRIMARY KEY (cursor)
            ) PARTITION BY RANGE (cursor);
            "#
        )?;

        // 5. Pre-create N partitions covering [1, N * partition_size + 1). N =
        //    (max_cursor / partition_size) + 1 + lookahead, ensuring the partition
        //    that contains max_cursor itself exists plus `lookahead` empty future
        //    partitions on top.
        let partition_count = max_cursor / partition_size + 1 + lookahead;
        create_future_partitions(connection, 1, partition_size, partition_count)?;

        // 6. Copy every row, preserving cursors. PG routes each row to the
        //    matching partition by cursor value.
        sql!(
            connection,
            r#"
            INSERT INTO changelog (
                cursor, table_name, record_id, row_action, name_link_id, store_id,
                is_sync_update, source_site_id, transfer_store_id, patient_link_id
            )
            SELECT
                cursor, table_name, record_id, row_action, name_link_id, store_id,
                is_sync_update, source_site_id, transfer_store_id, patient_id
            FROM old_changelog
            ORDER BY cursor;
            "#
        )?;

        // 7. Drop the old table now that all data is in the partitioned changelog.
        sql!(connection, "DROP TABLE old_changelog;")?;

        // 8. Re-own the sequence so it's tied to the new changelog.cursor, and
        //    continue the sequence from max_cursor (next nextval = max_cursor+1).
        //    GREATEST(.., 1) handles the empty-changelog case where setval(0) errors.
        sql!(
            connection,
            "ALTER SEQUENCE changelog_cursor_seq OWNED BY changelog.cursor;"
        )?;
        sql!(
            connection,
            "SELECT setval('changelog_cursor_seq', GREATEST({}, 1));",
            max_cursor
        )?;

        // 9. Create the four partitioned indexes on the parent. PG builds them
        //    across every partition in bulk.
        sql!(
            connection,
            r#"
            CREATE INDEX index_changelog_source_site_id
                ON changelog (source_site_id);
            CREATE INDEX index_changelog_store_id
                ON changelog (store_id);
            CREATE INDEX index_changelog_transfer_store_id
                ON changelog (transfer_store_id) WHERE transfer_store_id IS NOT NULL;
            CREATE INDEX index_changelog_patient_link_id
                ON changelog (patient_link_id) WHERE patient_link_id IS NOT NULL;
            "#
        )?;

        Ok(())
    }
}

#[cfg(feature = "postgres")]
fn create_future_partitions(
    connection: &StorageConnection,
    start: i64,
    size: i64,
    count: i64,
) -> anyhow::Result<()> {
    for i in 0..count {
        let from = start + i * size;
        let to = start + (i + 1) * size;
        // Partition names use the cursor lower bound as the suffix so naming is
        // stable across migration + runtime top-up — no counter to keep in sync.
        sql!(
            connection,
            "CREATE TABLE changelog_p_{} PARTITION OF changelog \
             FOR VALUES FROM ({}) TO ({});",
            from,
            from,
            to
        )?;
    }
    Ok(())
}

#[cfg(all(test, feature = "postgres"))]
mod tests {
    use crate::{
        migrations::{v2_18_00::V2_18_00, ChangelogPartitionConfig, *},
        test_db::*,
    };
    use diesel::{prelude::*, sql_types::BigInt};

    /// Partition migration on a populated changelog: rows copied across with
    /// cursors preserved, old_changelog dropped, exactly the expected number of
    /// partitions created. Uses small partition_size + lookahead so the math is
    /// easy to eyeball: cursors 1..=4, partition_size=2, lookahead=2 →
    /// 4/2+1+2 = 5 partitions.
    #[actix_rt::test]
    async fn test_partition_changelog_with_existing_data() {
        let connection = setup_pre_partition("migration_partition_changelog_existing").await;

        // Pre-populate changelog with sequential cursors 1..=4, mixed table_name
        // and row_action. Table/row_action columns are TEXT post-alter so any
        // string is accepted.
        diesel::sql_query(
            "INSERT INTO changelog (cursor, table_name, record_id, row_action) VALUES \
                 (1, 'invoice',     'r1', 'UPSERT'), \
                 (2, 'requisition', 'r2', 'UPSERT'), \
                 (3, 'invoice',     'r3', 'DELETE'), \
                 (4, 'stocktake',   'r4', 'DELETE')",
        )
        .execute(connection.lock().connection())
        .unwrap();

        let partition_size: i64 = 2;
        let lookahead: i64 = 2;
        let config = MigrationConfig {
            changelog_partition: ChangelogPartitionConfig {
                partition_size,
                lookahead_partitions: lookahead,
            },
        };

        run_partition_and_assert_partitioned(&connection, &config);

        // All 4 rows copied across, no extras.
        assert_eq!(changelog_count(&connection), 4);

        // Original cursors preserved verbatim.
        let preserved_cursors: i64 = diesel::sql_query(
            "SELECT count(*)::bigint AS value FROM changelog WHERE cursor IN (1, 2, 3, 4)",
        )
        .get_result::<Bigint>(connection.lock().connection())
        .unwrap()
        .value;
        assert_eq!(preserved_cursors, 4);

        // Exact partition count: 4/2 + 1 + 2 = 5.
        let max_cursor: i64 = 4;
        let expected_partitions = max_cursor / partition_size + 1 + lookahead;
        assert_eq!(count_partitions(&connection), expected_partitions);

        assert_insert_routes_to_partition(&connection, "u_new");
    }

    /// Partition migration on an empty changelog. Exercises the max_cursor=0
    /// path (setval(GREATEST(0,1)) keeps the sequence valid — PG rejects
    /// setval(seq, 0)) and the partition count formula collapses to
    /// `1 + lookahead`. New inserts after migration must still route to a
    /// partition without error.
    #[actix_rt::test]
    async fn test_partition_changelog_empty() {
        let connection = setup_pre_partition("migration_partition_changelog_empty").await;

        assert_eq!(changelog_count(&connection), 0);

        let config = MigrationConfig::default();
        run_partition_and_assert_partitioned(&connection, &config);

        // Still empty after migration — nothing to copy.
        assert_eq!(changelog_count(&connection), 0);

        // Exact partition count: 0/partition_size + 1 + lookahead = 1 + lookahead.
        let expected_partitions = 1 + config.changelog_partition.lookahead_partitions;
        assert_eq!(count_partitions(&connection), expected_partitions);

        assert_insert_routes_to_partition(&connection, "first_row");
    }

    #[derive(QueryableByName, Debug)]
    struct Bigint {
        #[diesel(sql_type = BigInt)]
        value: i64,
    }

    #[derive(QueryableByName, Debug)]
    struct TextValue {
        #[diesel(sql_type = diesel::sql_types::Text)]
        value: String,
    }

    /// Sets up a DB at v2.18 and runs only `alter_changelog_table_for_sync_v7`
    /// — the one earlier v3 fragment that reshapes `changelog` (TEXT columns,
    /// new `transfer_store_id` / `patient_id`). This skips
    /// `populate_changelog_with_rows_for_sync_v7_tables` as it inserts rows
    async fn setup_pre_partition(db_name: &str) -> StorageConnection {
        let SetupResult { connection, .. } = setup_test(SetupOption {
            db_name,
            version: Some(V2_18_00.version()),
            ..Default::default()
        })
        .await;

        super::super::alter_changelog_table_for_sync_v7::Migrate
            .migrate(&connection)
            .unwrap();

        connection
    }

    /// Calls the partition migration directly with the given config and asserts
    /// the post-migration shape common to every scenario.
    fn run_partition_and_assert_partitioned(
        connection: &StorageConnection,
        config: &MigrationConfig,
    ) {
        super::Migrate
            .migrate_with_config(connection, config)
            .unwrap();

        assert!(changelog_is_partitioned(connection));

        let old_changelog_exists: i64 = diesel::sql_query(
            "SELECT count(*)::bigint AS value FROM pg_class \
             WHERE relname = 'old_changelog' AND relkind = 'r'",
        )
        .get_result::<Bigint>(connection.lock().connection())
        .unwrap()
        .value;
        assert_eq!(
            old_changelog_exists, 0,
            "old_changelog should have been dropped"
        );
    }

    /// Inserts a row into the partitioned changelog and asserts it routes to a
    /// concrete partition (i.e. the partition for its cursor exists).
    fn assert_insert_routes_to_partition(connection: &StorageConnection, record_id: &str) {
        diesel::sql_query(format!(
            "INSERT INTO changelog (table_name, record_id, row_action) VALUES \
             ('unit', '{record_id}', 'UPSERT')"
        ))
        .execute(connection.lock().connection())
        .unwrap();

        let partition: String = diesel::sql_query(format!(
            "SELECT tableoid::regclass::text AS value FROM changelog WHERE record_id = '{record_id}'"
        ))
        .get_result::<TextValue>(connection.lock().connection())
        .unwrap()
        .value;
        assert!(
            partition.starts_with("changelog_p_"),
            "expected fresh insert to land in a partition, got {}",
            partition
        );
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

    fn changelog_is_partitioned(connection: &StorageConnection) -> bool {
        diesel::sql_query(
            "SELECT count(*)::bigint AS value FROM pg_partitioned_table \
             WHERE partrelid = 'changelog'::regclass",
        )
        .get_result::<Bigint>(connection.lock().connection())
        .unwrap()
        .value
            == 1
    }

    fn changelog_count(connection: &StorageConnection) -> i64 {
        diesel::sql_query("SELECT count(*)::bigint AS value FROM changelog")
            .get_result::<Bigint>(connection.lock().connection())
            .unwrap()
            .value
    }
}
