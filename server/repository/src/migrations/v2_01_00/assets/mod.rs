use crate::StorageConnection;

pub mod asset_property;
pub mod asset_property_data;

pub(crate) fn migrate_assets(connection: &StorageConnection) -> anyhow::Result<()> {
    asset_property::migrate(connection)?;
    asset_property_data::migrate(connection)?;
    Ok(())
}
