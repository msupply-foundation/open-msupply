#[cfg(test)]
pub(crate) mod test;

mod actor;
pub(crate) mod api;
pub(crate) mod central_data_synchroniser;
pub(crate) mod remote_data_synchroniser;
pub mod settings;
mod sync_api_credentials;
mod sync_buffer;
mod sync_serde;
pub mod synchroniser;
pub(crate) mod translation_and_integration;
pub(crate) mod translations;
use repository::{
    EqualFilter, KeyValueStoreRepository, RepositoryError, StorageConnection, Store, StoreFilter,
    StoreRepository,
};
pub use sync_api_credentials::SyncCredentials;
use thiserror::Error;

#[derive(Error, Debug)]
#[error("Failed to translate {table_name} sync record: {record}")]
pub(crate) struct SyncTranslationError {
    pub table_name: String,
    pub source: anyhow::Error,
    pub record: String,
}

pub(crate) struct ActiveStoresOnSite {
    stores: Vec<Store>,
}

#[derive(Error, Debug)]
pub(crate) enum GetActiveStoresOnSiteError {
    #[error("Database error while getting active store on site {0:?}")]
    DatabaseError(RepositoryError),
    #[error("Site id is not set in database")]
    SiteIdNotSet,
}

impl ActiveStoresOnSite {
    pub(crate) fn get(
        connection: &StorageConnection,
    ) -> Result<ActiveStoresOnSite, GetActiveStoresOnSiteError> {
        use GetActiveStoresOnSiteError as Error;

        let site_id = KeyValueStoreRepository::new(connection)
            .get_i32(repository::KeyValueType::SettingsSyncSiteId)
            .map_err(Error::DatabaseError)?
            .ok_or(Error::SiteIdNotSet)?;

        let stores = StoreRepository::new(connection)
            .query_by_filter(StoreFilter::new().site_id(EqualFilter::equal_to_i32(site_id)))
            .map_err(Error::DatabaseError)?;

        Ok(ActiveStoresOnSite { stores })
    }

    pub(crate) fn name_ids(&self) -> Vec<String> {
        self.stores.iter().map(|r| r.name_row.id.clone()).collect()
    }

    pub(crate) fn get_store_id_for_name_id(&self, name_id: &str) -> Option<String> {
        self.stores
            .iter()
            .find(|r| r.name_row.id == name_id)
            .map(|r| r.store_row.id.clone())
    }

    pub(crate) fn store_ids(&self) -> Vec<String> {
        self.stores.iter().map(|r| r.store_row.id.clone()).collect()
    }
}
