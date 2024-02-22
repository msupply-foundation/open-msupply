use crate::StorageConnection;

pub mod asset;
pub mod reference_data;

pub(crate) fn migrate_assets(connection: &StorageConnection) -> anyhow::Result<()> {
    reference_data::migrate(connection)?;
    asset::migrate(connection)?;
    Ok(())
}
