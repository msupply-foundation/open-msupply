use crate::{assets::asset_category, StorageConnection};

pub mod asset_catalogue;
pub mod reference_data;

pub(crate) fn migrate_assets(connection: &StorageConnection) -> anyhow::Result<()> {
    reference_data::migrate(connection)?;
    asset_catalogue::migrate(connection)?;
    Ok(())
}
