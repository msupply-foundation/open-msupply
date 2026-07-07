use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_site_sync_version"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE site
                ADD COLUMN sync_version TEXT NOT NULL DEFAULT 'V5_V6';
            "#
        )?;

        Ok(())
    }
}
