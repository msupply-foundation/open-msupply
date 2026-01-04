use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "reintegrate asset tables"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        sql!(
            connection,
            r#"
                UPDATE sync_buffer
                SET integration_datetime = null, integration_error = null
                WHERE table_name IN ('asset', 'asset_log') AND integration_error IS NOT NULL
            "#,
        )?;

        Ok(())
    }
}
