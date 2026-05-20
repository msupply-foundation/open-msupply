use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "create_changelog_indexes"
    }

    fn migrate_with_config(
        &self,
        connection: &StorageConnection,
        _config: &MigrationConfig,
    ) -> anyhow::Result<()> {
        // Runs after both `partition_changelog_by_cursor` (Postgres rebuild) /
        // `alter_sqlite_changelog_table_for_syncv7` (SQLite reshape) and after
        // `populate_changelog_with_rows_for_sync_v7_tables`. By then changelog
        // has no secondary indexes on either backend — both migrations dropped
        // them so the bulk copy and the central-table seed inserts didn't pay
        // index-maintenance cost. Now we re-instate one uniform index set.
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
