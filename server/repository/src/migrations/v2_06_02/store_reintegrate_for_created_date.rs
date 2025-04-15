use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "store_reintegrate_for_created_date"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                UPDATE sync_buffer
                SET integration_datetime = NULL
                WHERE table_name = 'store';
            "#
        )?;

        Ok(())
    }
}
