use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_maintenance_mode_pg_enums"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SETTINGS_PROCESSORS_ARE_PAUSED';
                    ALTER TYPE key_type ADD VALUE IF NOT EXISTS 'SETTINGS_MAINTENANCE_MODE_IS_ON';
                    ALTER TYPE system_log_type ADD VALUE IF NOT EXISTS 'PROCESSORS_PAUSE_CHANGED';
                    ALTER TYPE system_log_type ADD VALUE IF NOT EXISTS 'MAINTENANCE_MODE_CHANGED';
                "#
            )?;
        }

        Ok(())
    }
}
