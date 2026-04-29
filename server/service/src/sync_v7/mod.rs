use repository::{
    syncv7::GetCurrentSiteIdError, KeyValueStoreRepository, RepositoryError, StorageConnection,
    SyncBufferRowRepository,
};
use util::format_error;

pub mod api;
pub mod prepare;
pub mod serde;
pub mod sync;
pub mod sync_logger;
pub mod sync_on_central;
pub mod sync_status;
pub mod validate;
pub mod validate_translate_integrate;

#[cfg(test)]
mod test;

/// Returns the current site's id (i.e. the site this server runs as)
pub fn get_current_site_id(connection: &StorageConnection) -> Result<i32, GetCurrentSiteIdError> {
    let site_id = KeyValueStoreRepository::new(connection)
        .get_i32(repository::KeyType::SettingsSyncSiteId)?
        .ok_or(GetCurrentSiteIdError::SiteIdNotSet)?;

    Ok(site_id)
}

pub(crate) fn write_sync_buffer_error(
    record_id: &str,
    connection: &StorageConnection,
    error: &impl std::error::Error,
) -> Result<(), RepositoryError> {
    SyncBufferRowRepository::new(connection)
        .set_integration_result(record_id, Some(&format_error(&error)))
}

pub(crate) fn write_sync_buffer_success(
    record_id: &str,
    connection: &StorageConnection,
) -> Result<(), RepositoryError> {
    SyncBufferRowRepository::new(connection).set_integration_result(record_id, None)
}
