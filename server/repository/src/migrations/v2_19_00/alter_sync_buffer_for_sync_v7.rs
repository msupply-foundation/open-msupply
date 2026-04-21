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

        Ok(())
    }
}
