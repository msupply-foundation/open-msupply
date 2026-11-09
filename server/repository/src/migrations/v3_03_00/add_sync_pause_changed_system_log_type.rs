use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_sync_pause_changed_system_log_type"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE system_log_type ADD VALUE IF NOT EXISTS 'SYNC_PAUSE_CHANGED';
                "#
            )?;
        }

        Ok(())
    }
}
