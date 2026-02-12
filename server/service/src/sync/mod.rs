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
pub mod sync_buffer;
pub mod sync_on_central;
pub mod sync_status;
pub mod sync_user;
pub(crate) mod sync_utils;
pub mod synchroniser;
pub mod synchroniser_driver;
pub(crate) mod translation_and_integration;
pub(crate) mod translations;

use crate::service_provider::ServiceProvider;
use std::sync::RwLock;

use log::info;
use repository::{
    ChangelogFilter, EqualFilter, KeyValueStoreRepository, RepositoryError, StorageConnection,
    Store, StoreFilter, StoreRepository,
};

use serde::{Deserialize, Serialize};
use thiserror::Error;
use ts_rs::TS;

use self::api::SiteInfoV5;

#[derive(Serialize, Deserialize, TS, Debug)]
pub(crate) struct ActiveStoresOnSite {
    stores: Vec<Store>,
}

#[derive(Error, Debug)]
pub enum SyncChangelogError {
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error("Failed to get active stores on site")]
    GetActiveStoresOnSiteError(#[from] GetActiveStoresOnSiteError),
    #[error("mSupply Central site id is not set in database")]
    CentralSiteIdNotSet,
}

/// Returns changelog filter to filter out records that are not active on site
/// It is possible to have entries for foreign records in change log (other half of transfers)
/// these should be filtered out in sync push operation
pub(crate) fn get_sync_push_changelogs_filter(
    connection: &StorageConnection,
) -> Result<Option<ChangelogFilter>, SyncChangelogError> {
    if CentralServerConfig::is_central_server() {
        // If this is a central server, we want to send everything that that wasn't from legacy site
        let msupply_central_server_id = KeyValueStoreRepository::new(connection)
            .get_i32(repository::KeyType::SettingsSyncCentralServerSiteId)?
            .ok_or(SyncChangelogError::CentralSiteIdNotSet)?;

        return Ok(Some(ChangelogFilter::new().source_site_id(
            EqualFilter::not_equal_to_or_null(msupply_central_server_id),
        )));
    }

    let active_stores = ActiveStoresOnSite::get(connection)?;

    Ok(Some(
        ChangelogFilter::new()
            .store_id(EqualFilter::equal_any_or_null(active_stores.store_ids()))
            .is_sync_update(EqualFilter::equal_any_or_null(vec![false])),
    ))
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
    if IS_INITIALISED.read().unwrap().clone() {
        return true;
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
