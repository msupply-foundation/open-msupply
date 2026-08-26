use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    // Need to remove plugins since we've changed id in cli to have backend/frontend prefix
    fn identifier(&self) -> &'static str {
        "remove_plugins"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
            DELETE FROM backend_plugin;
            DELETE FROM frontend_plugin;
            DELETE FROM changelog WHERE table_name = 'backend_plugin';
            DELETE FROM changelog WHERE table_name = 'frontend_plugin';
            "#,
        )?;

        Ok(())
    }
}
