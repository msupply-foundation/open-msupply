use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "add_unserviceable_status_to_asset_status_enum"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                ALTER TYPE asset_log_status ADD VALUE IF NOT EXISTS
                'UNSERVICEABLE' AFTER  'DECOMMISSIONED';
            "#
            )?;
        }

        Ok(())
    }
}
