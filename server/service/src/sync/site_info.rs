use async_trait::async_trait;
use log::info;
use repository::{syncv7::SyncError, KeyType, KeyValueStoreRepository, RepositoryError};
use thiserror::Error;
use util::format_error;

use crate::{
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        api::{SiteInfoV5, SyncApiV5},
        settings::{SyncSettings, SYNC_V5_VERSION},
        CentralServerConfig,
    },
    sync_v7::sync::{ApiV7, SyncApiV7, VERSION},
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
    #[error(transparent)]
    SyncV7(#[from] SyncError),
}

// For unwrap and expect debug implementation is used
impl std::fmt::Debug for RequestAndSetSiteInfoError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", format_error(self))
    }
}

pub enum SiteInfo {
    V5(SiteInfoV5),
    V7(ApiV7::Status::Output),
}

#[async_trait]
pub trait SiteInfoTrait: Sync + Send {
    async fn request_and_set_site_info(
        &self,
        service_provider: &ServiceProvider,
        settings: &SyncSettings,
    ) -> Result<SiteInfo, RequestAndSetSiteInfoError>;
    fn get_site_id(&self, ctx: &ServiceContext) -> Result<Option<i32>, RepositoryError>;
}

pub struct SiteInfoService;

#[async_trait]
impl SiteInfoTrait for SiteInfoService {
    async fn request_and_set_site_info(
        &self,
        service_provider: &ServiceProvider,
        settings: &SyncSettings,
    ) -> Result<SiteInfo, RequestAndSetSiteInfoError> {
        use RequestAndSetSiteInfoError as Error;
        let ctx = service_provider.basic_context()?;
        let repo = KeyValueStoreRepository::new(&ctx.connection);

        if CentralServerConfig::is_central_server() {
            // This can be simplified
            let sync_api_v5 = SyncApiV5::new(SyncApiV5::new_settings(
                settings,
                service_provider,
                SYNC_V5_VERSION,
            )?)?;

            info!("Requesting site info");
            let site_info = sync_api_v5.get_site_info().await?;

            // If site uuid is in database check against new site uuid
            if let Some(site_uuid) = repo.get_string(KeyType::SettingsSyncSiteUuid)? {
                if site_uuid != site_info.id {
                    return Err(Error::SiteUUIDIsBeingChanged(site_uuid, site_info.id));
                }
            }

            repo.set_string(KeyType::SettingsSyncSiteUuid, Some(site_info.id.clone()))?;
            repo.set_i32(KeyType::SettingsSyncSiteId, Some(site_info.site_id))?;
            repo.set_i32(
                KeyType::SettingsSyncCentralServerSiteId,
                Some(site_info.site_id),
            )?;

            info!("Received site info");

            Ok(SiteInfo::V5(site_info))
        } else {
            info!("Requesting site info v7");
            let sync_api_v7 = SyncApiV7 {
                url: settings.url.parse().unwrap(),
                version: VERSION,
                username: settings.username.clone(),
                password: settings.password_sha256.clone(),
            };

            let site_info = sync_api_v7.site_status(()).await?;

            // // If site uuid is in database check against new site uuid
            // if let Some(site_uuid) = repo.get_string(KeyType::SettingsSyncSiteUuid)? {
            //     if site_uuid != site_info.site_id {
            //         return Err(Error::SiteUUIDIsBeingChanged(site_uuid, site_info.site_id));
            //     }
            // }

            // repo.set_string(
            //     KeyType::SettingsSyncSiteUuid,
            //     Some(site_info.site_id.clone()),
            // )?;
            repo.set_i32(KeyType::SettingsSyncSiteId, Some(site_info.site_id))?;
            repo.set_i32(
                KeyType::SettingsSyncCentralServerSiteId,
                Some(site_info.central_site_id),
            )?;

            info!("Received site info v7");

            Ok(SiteInfo::V7(site_info))
        }
    }

    fn get_site_id(&self, ctx: &ServiceContext) -> Result<Option<i32>, RepositoryError> {
        let site_id =
            KeyValueStoreRepository::new(&ctx.connection).get_i32(KeyType::SettingsSyncSiteId)?;

        Ok(site_id)
    }
}
