use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_sync_log_v7_reference"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Logical FK to sync_request.reference_id (not enforced — joined
        // sync_request rows share a value, so the column can't be UNIQUE).
        sql!(
            connection,
            r#"
                ALTER TABLE sync_log_v7 ADD COLUMN reference_id TEXT;
            "#
        )?;

        Ok(())
    }
}
