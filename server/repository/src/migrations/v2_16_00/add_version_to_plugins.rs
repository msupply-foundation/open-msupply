use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_version_to_plugins"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                ALTER TABLE backend_plugin ADD COLUMN version TEXT NOT NULL DEFAULT '1.0.0';
                ALTER TABLE frontend_plugin ADD COLUMN version TEXT NOT NULL DEFAULT '1.0.0';
            "#
        )?;

        Ok(())
    }
}
