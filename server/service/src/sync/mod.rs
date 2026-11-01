#[cfg(test)]
pub(crate) mod test;

pub mod api;
pub mod api_v6;
pub(crate) mod central_data_synchroniser;
pub(crate) mod central_data_synchroniser_v6;
pub(crate) mod central_mapping_custom_fields;
pub use central_mapping_custom_fields::seed_central_mapping_custom_fields;
pub mod file_sync_driver;
pub mod file_synchroniser;
mod integrate_document;
pub mod maintenance_mode;
pub(crate) mod remote_data_synchroniser;
pub(crate) mod repair_source_site_id;
pub mod settings;
pub mod site_auth;
pub mod sync_api_pause;
pub mod sync_buffer;
pub mod sync_on_central;
pub mod sync_pause;
pub mod sync_status;
pub mod synchroniser;
pub mod synchroniser_driver;
pub mod synchroniser_runner;
pub(crate) mod translation_and_integration;
pub(crate) mod translations;

use crate::service_provider::ServiceProvider;
use std::sync::RwLock;

use log::info;
use repository::{
    EqualFilter, KeyType, KeyValueStoreRepository, RepositoryError, StorageConnection, Store,
    StoreFilter, StoreRepository,
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
    StandaloneCentral,
}

static CENTRAL_SERVER_CONFIG: RwLock<CentralServerConfig> =
    RwLock::new(CentralServerConfig::NotConfigured);
static IS_INITIALISED: RwLock<bool> = RwLock::new(false);

impl CentralServerConfig {
    fn inner_is_central_server(&self) -> bool {
        matches!(
            self,
            Self::IsCentralServer | Self::ForcedCentralServer | Self::StandaloneCentral
        )
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

    pub fn is_standalone_central() -> bool {
        matches!(
            *CENTRAL_SERVER_CONFIG.read().unwrap(),
            CentralServerConfig::StandaloneCentral
        )
    }

    pub fn get() -> Self {
        CENTRAL_SERVER_CONFIG.read().unwrap().clone()
    }

    fn set_central_server_config(site_info: &SiteInfoV5) {
        let new_config = Self::new(site_info);
        // Need to drop read before write
        {
            let current_config = CENTRAL_SERVER_CONFIG.read().unwrap();

            // Standalone central never syncs upstream
            if matches!(*current_config, CentralServerConfig::StandaloneCentral) {
                return;
            }

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

    pub fn set_standalone_central() {
        info!("Running as standalone central");
        *CENTRAL_SERVER_CONFIG.write().unwrap() = CentralServerConfig::StandaloneCentral;
    }

    pub fn restore_central_standalone(
        connection: &StorageConnection,
    ) -> Result<(), RepositoryError> {
        if let Some(true) =
            KeyValueStoreRepository::new(connection).get_bool(KeyType::IsStandaloneCentral)?
        {
            Self::set_standalone_central();
        }
        Ok(())
    }
}
// We cache the initialised state to avoid having to check the database every time. A site never
// goes back to not initialised, so only `true` is cached.
fn try_is_initialised(service_provider: &ServiceProvider) -> Result<bool, RepositoryError> {
    if *IS_INITIALISED.read().unwrap() {
        return Ok(true);
    }

    let ctx = service_provider.basic_context()?;
    let is_initialised = service_provider.sync_status_service.is_initialised(&ctx)?;
    if is_initialised {
        *IS_INITIALISED.write().unwrap() = true;
    }
    Ok(is_initialised)
}

/// Panics if the database is unreachable, as there's no point syncing without it.
pub(crate) fn is_initialised(service_provider: &ServiceProvider) -> bool {
    try_is_initialised(service_provider).unwrap()
}

/// [`is_initialised`] for anything that must stay off this site's data until its first sync has
/// integrated: the `/central` routes, schedule plugins, cold chain login and ledger fix. v5/v6
/// integration commits in batches while the site initialises (see `integration_uses_transaction`),
/// so until then the data is partial. A database error reads as not initialised, so callers refuse
/// rather than panic.
pub fn is_initialised_or_log(service_provider: &ServiceProvider) -> bool {
    try_is_initialised(service_provider).unwrap_or_else(|error| {
        log::error!(
            "Failed to read initialisation status, treating as not initialised: {error:#?}"
        );
        false
    })
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

// TEST ONLY — override the central server URL the FileSyncDriver reads on
// each iteration. Used by integration tests that need to route file uploads
// through toxiproxy after the initial sync has populated the config with the
// real central URL.
pub fn test_util_set_central_server_url(url: String) {
    *CENTRAL_SERVER_CONFIG.write().unwrap() = CentralServerConfig::CentralServerUrl(url);
}

// TEST ONLY — reset the cached initialisation latch. `is_initialised` only ever caches
// `true`, so a test that needs to observe the not-yet-initialised path has to clear it.
// nextest (used in CI) gives every test its own process, so this only guards against
// another test in the same process latching first — it is not protection against
// concurrent mutation.
pub fn test_util_set_is_initialised(is_initialised: bool) {
    *IS_INITIALISED.write().unwrap() = is_initialised;
}
