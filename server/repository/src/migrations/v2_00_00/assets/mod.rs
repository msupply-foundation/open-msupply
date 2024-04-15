use crate::StorageConnection;

pub mod activity_log;
pub mod asset;
pub mod asset_catalogue_data;
pub mod asset_catalogue_item;
pub mod asset_log;
pub mod asset_log_reason;
mod label_printer;
pub mod latest_asset_log;
pub mod reference_data;
mod sync_triggers_central;

pub(crate) fn migrate_assets(connection: &StorageConnection) -> anyhow::Result<()> {
    reference_data::migrate(connection)?;
    asset_catalogue_item::migrate(connection)?;
    asset_catalogue_data::migrate(connection)?;
    asset_log_reason::migrate(connection)?;
    asset::migrate(connection)?;
    asset_log::migrate(connection)?;
    activity_log::migrate(connection)?;
    latest_asset_log::migrate(connection)?;
    sync_triggers_central::migrate(connection)?;
    label_printer::migrate(connection)?;
    Ok(())
}
