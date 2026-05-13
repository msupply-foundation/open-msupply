use repository::{
    syncv7::GetCurrentSiteIdError, KeyValueStoreRepository, StorageConnection,
};

pub mod api;
pub mod patient_lookup;
pub mod prepare;
pub mod serde;
pub mod sync;
pub mod sync_logger;
pub mod sync_on_central;
pub mod sync_request;
pub mod sync_request_runner;
pub mod sync_status;
pub mod synchroniser;
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
