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
pub mod site_auth;
pub mod sync_buffer;
pub mod sync_on_central;
pub mod sync_status;
pub mod sync_user;
pub mod synchroniser;
pub mod synchroniser_driver;
pub mod synchroniser_runner;
pub(crate) mod translation_and_integration;
pub(crate) mod translations;

use crate::service_provider::ServiceProvider;
use std::sync::RwLock;

use log::info;
use repository::{
    EqualFilter, KeyValueStoreRepository, RepositoryError, StorageConnection, Store, StoreFilter,
    StoreRepository,
};

use serde::{Deserialize, Serialize};
use thiserror::Error;
use ts_rs::TS;

use self::api::SiteInfoV5;

#[derive(Serialize, Deserialize, TS, Debug)]
pub(crate) struct ActiveStoresOnSite {
    pub(crate) site_id: i32,
    pub(crate) stores: Vec<Store>,
}

#[derive(Error, Debug)]
pub enum GetActiveStoresOnSiteError {
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error("Site id is not set in database")]
    SiteIdNotSet,
}

impl ActiveStoresOnSite {
    pub(crate) fn get(
        connection: &StorageConnection,
    ) -> Result<ActiveStoresOnSite, GetActiveStoresOnSiteError> {
        use GetActiveStoresOnSiteError as Error;

        let site_id = KeyValueStoreRepository::new(connection)
            .get_i32(repository::KeyType::SettingsSyncSiteId)?
            .ok_or(Error::SiteIdNotSet)?;

        let stores = StoreRepository::new(connection)
            .query_by_filter(StoreFilter::new().site_id(EqualFilter::equal_to(site_id)))?;

        Ok(ActiveStoresOnSite { site_id, stores })
    }

    pub(crate) fn site_id(&self) -> i32 {
        self.site_id
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

    pub(crate) fn store_ids_for_site(
        connection: &StorageConnection,
        site_id: i32,
    ) -> Result<Vec<String>, RepositoryError> {
        let stores = StoreRepository::new(connection)
            .query_by_filter(StoreFilter::new().site_id(EqualFilter::equal_to(site_id)))?;
        Ok(stores.into_iter().map(|s| s.store_row.id).collect())
    }
}

#[derive(PartialEq, Clone)]
pub enum CentralServerConfig {
    NotConfigured,
    IsCentralServer,
    CentralServerUrl(String),
    ForcedCentralServer,
}

static CENTRAL_SERVER_CONFIG: RwLock<CentralServerConfig> =
    RwLock::new(CentralServerConfig::NotConfigured);
static IS_INITIALISED: RwLock<bool> = RwLock::new(false);

impl CentralServerConfig {
    fn inner_is_central_server(&self) -> bool {
        matches!(self, Self::IsCentralServer | Self::ForcedCentralServer)
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

    // Set central server on startup, subsequent sync calls can override this setting
    pub fn set_is_central_server_on_startup() {
        info!("Running as central from override");
        *CENTRAL_SERVER_CONFIG.write().unwrap() = CentralServerConfig::ForcedCentralServer;
    }
}
pub(crate) fn is_initialised(service_provider: &ServiceProvider) -> bool {
    // We cache the initialised state to avoid having to check the database every time. This stops
    // unnecessary database queries and avoids having to unwrap the database connection. We still
    // unwrap on the first check as there's no point starting up without the database.
    if *IS_INITIALISED.read().unwrap() {
        true
    } else {
        let ctx = service_provider.basic_context().unwrap();
        let is_initialised = service_provider
            .sync_status_service
            .is_initialised(&ctx)
            .unwrap();

        if is_initialised {
            *IS_INITIALISED.write().unwrap() = true;
        }

        is_initialised
    }
}

// TEST ONLY
pub fn test_util_set_is_central_server(is_central: bool) {
    match is_central {
        true => {
            *CENTRAL_SERVER_CONFIG.write().unwrap() = CentralServerConfig::IsCentralServer;
        }
        false => {
            *CENTRAL_SERVER_CONFIG.write().unwrap() =
                CentralServerConfig::CentralServerUrl("".to_string());
        }
    }
}
