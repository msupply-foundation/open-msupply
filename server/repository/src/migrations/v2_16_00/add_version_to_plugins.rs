use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_version_to_plugins"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            // TODO migration fails if theres any installed plugins, is that a problem?
            r#"
                ALTER TABLE backend_plugin ADD COLUMN version TEXT NOT NULL;
                ALTER TABLE frontend_plugin ADD COLUMN version TEXT NOT NULL;
            "#
        )?;

        Ok(())
    }
}
