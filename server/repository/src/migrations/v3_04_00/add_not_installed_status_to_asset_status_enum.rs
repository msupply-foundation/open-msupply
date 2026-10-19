use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_not_installed_status_to_asset_status_enum"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                ALTER TYPE asset_log_status ADD VALUE IF NOT EXISTS
                'NOT_INSTALLED' AFTER 'UNSERVICEABLE';
            "#
            )?;
        }

        Ok(())
    }
}
