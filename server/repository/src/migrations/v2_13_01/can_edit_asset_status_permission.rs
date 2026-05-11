use crate::migrations::*;

pub(crate) struct Migrate;

impl MigrationFragment for Migrate {
    fn identifier(&self) -> &'static str {
        "can_edit_asset_status_permission"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        if cfg!(feature = "postgres") {
            sql!(
                connection,
                r#"
                    ALTER TYPE permission_type ADD VALUE 'ASSET_STATUS_MUTATE';
                "#
            )?;
        }

        Ok(())
    }
}
