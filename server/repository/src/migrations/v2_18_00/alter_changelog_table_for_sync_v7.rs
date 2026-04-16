use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "alter_changelog_table_for_sync_v7"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Add transfer_store_id and patient_id 
        #[cfg(not(feature = "postgres"))]
        sql!(
            connection,
            r#"
                ALTER TABLE changelog ADD COLUMN transfer_store_id TEXT;
                ALTER TABLE changelog ADD COLUMN patient_id TEXT;
            "#
        )?;

        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                ALTER TABLE changelog ADD COLUMN transfer_store_id UUID;
                ALTER TABLE changelog ADD COLUMN patient_id UUID;
            "#
        )?;

        // Create partial indexes on transfer_store_id and patient_id
        sql!(
            connection,
            r#"
                CREATE INDEX index_changelog_transfer_store_id ON changelog (transfer_store_id) WHERE transfer_store_id IS NOT NULL;
                CREATE INDEX index_changelog_patient_id ON changelog (patient_id) WHERE patient_id IS NOT NULL;
            "#
        )?;

        // Convert row_action from text/enum to boolean (true = UPSERT, false = DELETE)
        sql!(
            connection,
            r#"
                ALTER TABLE changelog ADD COLUMN row_action_bool BOOLEAN NOT NULL DEFAULT TRUE;

                UPDATE changelog SET row_action_bool = CASE
                    WHEN row_action = 'UPSERT' THEN TRUE
                    ELSE FALSE
                END;

                ALTER TABLE changelog DROP COLUMN row_action;
                ALTER TABLE changelog RENAME COLUMN row_action_bool TO row_action;
            "#
        )?;

        // Drop the old Postgres enum type
        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                DROP TYPE IF EXISTS row_action_type;
            "#
        )?;

        Ok(())
    }
}
