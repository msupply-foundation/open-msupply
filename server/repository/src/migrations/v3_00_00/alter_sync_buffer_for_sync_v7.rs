use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "alter_sync_buffer_for_sync_v7"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE sync_buffer ADD COLUMN store_id TEXT;
                ALTER TABLE sync_buffer ADD COLUMN transfer_store_id TEXT;
                ALTER TABLE sync_buffer ADD COLUMN patient_id TEXT;
            "#
        )?;

        #[cfg(feature = "postgres")]
        sql!(
            connection,
            r#"
                -- Convert action from Postgres enum to TEXT (SQLite is already TEXT)
                ALTER TABLE sync_buffer ALTER COLUMN action TYPE TEXT USING action::TEXT;
                DROP TYPE IF EXISTS sync_action;
            "#
        )?;

        Ok(())
    }
}
