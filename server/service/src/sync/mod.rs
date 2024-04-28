#[cfg(test)]
pub(crate) mod test;

pub mod api;
pub mod api_v6;
pub(crate) mod central_data_synchroniser;
pub(crate) mod central_data_synchroniser_v6;
pub mod file_sync_driver;
pub mod file_synchroniser;
mod integrate_document;
pub(crate) mod remote_data_synchroniser;
pub mod settings;
pub mod site_info;
mod sync_buffer;
pub mod sync_on_central;
pub(crate) mod sync_serde;
pub mod sync_status;
pub mod sync_user;
pub mod synchroniser;
pub mod synchroniser_driver;
pub(crate) mod translation_and_integration;
pub(crate) mod translations;

use std::sync::RwLock;

use log::info;
use repository::{
    ChangelogFilter, EqualFilter, KeyValueStoreRepository, RepositoryError, StorageConnection,
    Store, StoreFilter, StoreRepository,
};
use crate::service_provider::ServiceProvider;

use thiserror::Error;

use self::api::SiteInfoV5;

pub(crate) struct ActiveStoresOnSite {
    stores: Vec<Store>,
}

/// Returns changelog filter to filter out records that are not active on site
/// It is possible to have entries for foreign records in change log (other half of transfers)
/// these should be filtered out in sync push operation
pub(crate) fn get_sync_push_changelogs_filter(
    connection: &StorageConnection,
) -> Result<Option<ChangelogFilter>, GetActiveStoresOnSiteError> {
    let active_stores = ActiveStoresOnSite::get(&connection)?;

    Ok(Some(
        ChangelogFilter::new()
            .store_id(EqualFilter::equal_any_or_null(active_stores.store_ids()))
            .is_sync_update(EqualFilter::equal_or_null_bool(false)),
    ))
}

#[derive(Error, Debug)]
pub(crate) enum GetActiveStoresOnSiteError {
    #[error("Database error while getting active store on site")]
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

#[derive(PartialEq, Clone)]
pub enum CentralServerConfig {
    NotConfigured,
    IsCentralServer,
    CentralServerUrl(String),
}

static CENTRAL_SERVER_CONFIG: RwLock<CentralServerConfig> =
    RwLock::new(CentralServerConfig::NotConfigured);

impl CentralServerConfig {
    fn inner_is_central_server(&self) -> bool {
        match self {
            Self::IsCentralServer => true,
            _ => false,
        }
    }

    fn new(site_info: &SiteInfoV5) -> Self {
        match site_info.is_central_server {
            true => Self::IsCentralServer,
            false => Self::CentralServerUrl(site_info.central_server_url.clone()),
        }
    }

    pub fn is_central_server() -> bool {
        CENTRAL_SERVER_CONFIG
            .read()
            .unwrap()
            .inner_is_central_server()
    }

    pub fn get() -> Self {
        CENTRAL_SERVER_CONFIG.read().unwrap().clone()
    }

    fn set_central_server_config(site_info: &SiteInfoV5) {
        let new_config = Self::new(site_info);
        // Need to drop read before write
        {
            let current_config = CENTRAL_SERVER_CONFIG.read().unwrap();

            if new_config == *current_config {
                return;
            }

            if !current_config.inner_is_central_server() && new_config.inner_is_central_server() {
                info!("Running as central");
            }
        }

        *CENTRAL_SERVER_CONFIG.write().unwrap() = new_config;
    }
}


pub(crate) fn is_initialised(service_provider: &ServiceProvider) -> bool {
    let ctx = service_provider.basic_context().unwrap();
    service_provider
        .sync_status_service
        .is_initialised(&ctx)
        .unwrap()
}
