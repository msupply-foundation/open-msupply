use crate::StorageConnection;

pub mod reference_data;

pub(crate) fn migrate_assets(connection: &StorageConnection) -> anyhow::Result<()> {
    reference_data::migrate(connection)?;
    Ok(())
}
