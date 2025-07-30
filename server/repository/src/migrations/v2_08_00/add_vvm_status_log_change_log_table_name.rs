use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_vvm_status_log_change_log_table_name"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                "ALTER TYPE changelog_table_name ADD VALUE IF NOT EXISTS 'vvm_status_log';"
            )?;
        }
        Ok(())
    }
}
