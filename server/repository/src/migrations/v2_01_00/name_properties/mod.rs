use crate::{migrations::helpers::run_without_change_log_updates, StorageConnection};

pub mod name_property;
pub mod name_property_data;

pub(crate) fn migrate_name_properties(connection: &StorageConnection) -> anyhow::Result<()> {
    run_without_change_log_updates(connection, |connection| {
        name_property::migrate(connection)?;
        name_property_data::migrate(connection)?;
        Ok(())
    })?;
    Ok(())
}
