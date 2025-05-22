use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "reintegrate_options_sync_buffer_records"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        // Incorrect table name was cleared in previous migration/RC, need to clear the right one so
        // reasons re-sync
        sql!(
            connection,
            r#"
                UPDATE sync_buffer
                    SET integration_datetime = NULL
                    WHERE table_name = 'options';  
            "#
        )?;

        Ok(())
    }
}
