use crate::migrations::*;

pub mod asset;
pub mod asset_catalogue;
pub mod asset_catalogue_data;
pub mod asset_property;
pub mod asset_property_data;

pub(crate) struct MigrateAssets;
impl MigrationFragment for MigrateAssets {
    fn identifier(&self) -> &'static str {
        "v2_01_00_migrate_assets"
    }

    fn migrate(&self, connection: &StorageConnection) -> anyhow::Result<()> {
        helpers::run_without_change_log_updates(connection, |connection| {
            asset::migrate(connection)?;
            asset_catalogue::migrate(connection)?;
            asset_catalogue_data::migrate(connection)?;
            asset_property::migrate(connection)?;
            asset_property_data::migrate(connection)?;
            Ok(())
        })?;
        Ok(())
    }
}
