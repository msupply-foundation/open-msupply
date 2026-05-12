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
        // Runs after `partition_changelog_by_cursor` (which leaves the new
        // partitioned table without secondary indexes) and after
        // `populate_changelog_with_rows_for_sync_v7_tables` (which seeds rows
        // into central tables). Building the indexes only now means the bulk
        // INSERTs above don't have to maintain them per row.
        //
        // For SQLite the partition migration leaves secondary indexes intact
        // except `patient_link_id`, which it dropped after renaming the
        // underlying column from `patient_id`. So both backends end up needing
        // the patient_link_id index; Postgres additionally needs the four it
        // dropped during the rebuild.
        if cfg!(feature = "postgres") {
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
        } else {
            sql!(
                connection,
                "CREATE INDEX index_changelog_patient_link_id \
                 ON changelog (patient_link_id) WHERE patient_link_id IS NOT NULL;"
            )?;
        }
        Ok(())
    }
}
