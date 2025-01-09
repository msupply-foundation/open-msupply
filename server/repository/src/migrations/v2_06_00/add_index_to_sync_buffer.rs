use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_index_to_sync_buffer"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
             CREATE INDEX "index_sync_buffer_all" ON "sync_buffer" (action, table_name, integration_datetime, integration_error, source_site_id);
        "#
        )?;

        Ok(())
    }
}
