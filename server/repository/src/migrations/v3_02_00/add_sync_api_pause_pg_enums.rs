use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_sync_api_pause_pg_enums"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SETTINGS_SYNC_API_IS_PAUSED';
                    ALTER TYPE system_log_type ADD VALUE IF NOT EXISTS 'SYNC_API_PAUSE_CHANGED';
                    ALTER TYPE sync_api_error_code ADD VALUE IF NOT EXISTS 'SYNC_API_PAUSED';
                "#
            )?;
        }

        Ok(())
    }
}
