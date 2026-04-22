use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "alter_changelog_and_related_tables_for_sync_v7"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                -- Drop changelog_deduped view before altering columns (SQLite requires this)
                DROP VIEW IF EXISTS changelog_deduped;

                -- Add transfer_store_id and patient_id to changelog
                ALTER TABLE changelog ADD COLUMN transfer_store_id TEXT;
                ALTER TABLE changelog ADD COLUMN patient_id TEXT;

                -- Create partial indexes on transfer_store_id and patient_id
                CREATE INDEX index_changelog_transfer_store_id ON changelog (transfer_store_id) WHERE transfer_store_id IS NOT NULL;
                CREATE INDEX index_changelog_patient_id ON changelog (patient_id) WHERE patient_id IS NOT NULL;

                -- Drop row_action index
                DROP INDEX IF EXISTS index_changelog_row_action;

                -- Add transfer_store_id to requisition and invoice
                ALTER TABLE requisition ADD COLUMN transfer_store_id TEXT;
                ALTER TABLE invoice ADD COLUMN transfer_store_id TEXT;
            "#
        )?;

        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                -- Convert table_name and row_action from Postgres enums to TEXT (SQLite is already TEXT)
                ALTER TABLE changelog ALTER COLUMN table_name TYPE TEXT USING table_name::TEXT;
                ALTER TABLE changelog ALTER COLUMN row_action TYPE TEXT USING row_action::TEXT;
                DROP TYPE IF EXISTS changelog_table_name;
                DROP TYPE IF EXISTS row_action_type;
            "#
        )?;

        Ok(())
    }
}
