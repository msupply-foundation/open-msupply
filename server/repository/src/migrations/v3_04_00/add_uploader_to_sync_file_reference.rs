use crate::migrations::*;

/// Uploader of a sync file (#909). Version numbers are derived on read from the
/// files a record holds under one name, so nothing is stored or backfilled.
pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_uploader_to_sync_file_reference"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE sync_file_reference
                ADD COLUMN user_id TEXT;
            "#
        )?;

        Ok(())
    }
}
