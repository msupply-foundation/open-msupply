use async_trait::async_trait;
use log::info;
use repository::{KeyType, KeyValueStoreRepository, RepositoryError};
use thiserror::Error;
use util::format_error;

use crate::{
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        api::{SiteInfoV5, SyncApiV5},
        settings::{SyncSettings, SYNC_VERSION},
    },
};

use super::api::{SyncApiError, SyncApiV5CreatingError};

#[derive(Error)]
pub enum RequestAndSetSiteInfoError {
    #[error("Api error while requesting site info")]
    RequestSiteInfoError(#[from] SyncApiError),
    #[error("Database error while requesting site info")]
    DatabaseError(#[from] RepositoryError),
    #[error("Attempt to change initialised site, UUID does not match: current ({0}) new ({1}")]
    SiteUUIDIsBeingChanged(String, String),
    #[error("Error while requesting and setting site info")]
    SyncApiV5CreatingError(#[from] SyncApiV5CreatingError),
}

// For unwrap and expect debug implementation is used
impl std::fmt::Debug for RequestAndSetSiteInfoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", format_error(self))
    }
}

#[async_trait]
pub trait SiteInfoTrait: Sync + Send {
    async fn request_and_set_site_info(
        &self,
        service_provider: &ServiceProvider,
        settings: &SyncSettings,
    ) -> Result<SiteInfoV5, RequestAndSetSiteInfoError>;
    fn get_site_id(&self, ctx: &ServiceContext) -> Result<Option<i32>, RepositoryError>;
}

pub struct SiteInfoService;

#[async_trait]
impl SiteInfoTrait for SiteInfoService {
    async fn request_and_set_site_info(
        &self,
        service_provider: &ServiceProvider,
        settings: &SyncSettings,
    ) -> Result<SiteInfoV5, RequestAndSetSiteInfoError> {
        use RequestAndSetSiteInfoError as Error;

        // This can be simplified
        let sync_api_v5 = SyncApiV5::new(SyncApiV5::new_settings(
            &settings,
            &service_provider,
            SYNC_VERSION,
        )?)?;
        let ctx = service_provider.basic_context()?;

        info!("Requesting site info");
        let site_info = sync_api_v5.get_site_info().await?;

        let repo = KeyValueStoreRepository::new(&ctx.connection);

        // If site uuid is in database check against new site uuid
        if let Some(site_uuid) = repo.get_string(KeyType::SettingsSyncSiteUuid)? {
            if site_uuid != site_info.id {
                return Err(Error::SiteUUIDIsBeingChanged(site_uuid, site_info.id));
            }
        }

        repo.set_string(KeyType::SettingsSyncSiteUuid, Some(site_info.id.clone()))?;
        repo.set_i32(KeyType::SettingsSyncSiteId, Some(site_info.site_id.clone()))?;

        info!("Received site info");

        Ok(site_info)
    }

    fn get_site_id(&self, ctx: &ServiceContext) -> Result<Option<i32>, RepositoryError> {
        let site_id =
            KeyValueStoreRepository::new(&ctx.connection).get_i32(KeyType::SettingsSyncSiteId)?;

        Ok(site_id)
    }
}
