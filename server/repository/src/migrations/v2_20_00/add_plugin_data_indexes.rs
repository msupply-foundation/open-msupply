use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_plugin_data_indexes"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // With plugin data expected to grow significantly (e.g. one record per
        // prescription per plugin), lookups by `data_identifier` -- often
        // combined with `plugin_code` -- benefit greatly from an index.
        sql!(
            connection,
            r#"
            CREATE INDEX IF NOT EXISTS index_plugin_data_data_identifier ON plugin_data (data_identifier);
            CREATE INDEX IF NOT EXISTS index_plugin_data_plugin_code_data_identifier ON plugin_data (plugin_code, data_identifier);
            "#
        )?;

        Ok(())
    }
}
