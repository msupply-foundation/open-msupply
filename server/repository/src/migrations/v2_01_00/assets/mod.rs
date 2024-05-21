use crate::{migrations::helpers::run_without_change_log_updates, StorageConnection};

pub mod asset;
pub mod asset_catalogue_data;
pub mod asset_property;
pub mod asset_property_data;

pub(crate) fn migrate_assets(connection: &StorageConnection) -> anyhow::Result<()> {
    run_without_change_log_updates(connection, |connection| {
        asset::migrate(connection)?;
        asset_catalogue_data::migrate(connection)?;
        asset_property::migrate(connection)?;
        asset_property_data::migrate(connection)?;
        Ok(())
    })?;
    Ok(())
}
