use async_trait::async_trait;
use log::info;
use repository::{KeyValueStoreRepository, KeyValueType, RepositoryError};
use thiserror::Error;
use util::{format_error, is_central_server};

use crate::{
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        api::{SiteInfoV5, SyncApiV5},
        api_v7::SyncApiV7,
        settings::{SyncSettings, SYNC_VERSION},
    },
};

use super::{
    api::{SyncApiError, SyncApiV5CreatingError},
    api_v7::{SiteInfoV7, SyncApiErrorV7, SyncApiV7CreatingError},
};

#[derive(Error)]
pub enum RequestAndSetSiteInfoError {
    #[error("Api error while requesting site info")]
    RequestSiteInfoError(#[from] SyncApiError),
    #[error("Api error while requesting site info")]
    RequestSiteInfoErrorV7(#[from] SyncApiErrorV7),
    #[error("Database error while requesting site info")]
    DatabaseError(#[from] RepositoryError),
    #[error("Attempt to change initialised site, UUID does not match: current ({0}) new ({1}")]
    SiteUUIDIsBeingChanged(String, String),
    #[error("Error while requesting and setting site info")]
    SyncApiV5CreatingError(#[from] SyncApiV5CreatingError),
    #[error("Error while requesting and setting site info")]
    SyncApiV7CreatingError(#[from] SyncApiV7CreatingError),
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
    ) -> Result<(), RequestAndSetSiteInfoError>;

    fn get_site_id(&self, ctx: &ServiceContext) -> Result<Option<i32>, RepositoryError>;
}

pub struct SiteInfoService;

impl SiteInfoService {
    async fn request_and_set_site_info_v7(
        &self,
        service_provider: &ServiceProvider,
        settings: &SyncSettings,
    ) -> Result<SiteInfoV7, RequestAndSetSiteInfoError> {
        use RequestAndSetSiteInfoError as Error;

        // This can be simplified
        let sync_api_v7 = SyncApiV7::new(settings.clone())?;
        let ctx = service_provider.basic_context()?;

        info!("Requesting site info");
        let site_info = sync_api_v7.get_site_info().await?;

        let repo = KeyValueStoreRepository::new(&ctx.connection);

        // If site uuid is in database check against new site uuid
        if let Some(site_uuid) = repo.get_string(KeyValueType::SettingsSyncSiteUuid)? {
            if site_uuid != site_info.id {
                return Err(Error::SiteUUIDIsBeingChanged(site_uuid, site_info.id));
            }
        }

        repo.set_string(
            KeyValueType::SettingsSyncSiteUuid,
            Some(site_info.id.clone()),
        )?;
        repo.set_i32(
            KeyValueType::SettingsSyncSiteId,
            Some(site_info.site_id.clone()),
        )?;

        info!("Received site info");

        Ok(site_info)
    }

    async fn request_and_set_site_info_v5(
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
        if let Some(site_uuid) = repo.get_string(KeyValueType::SettingsSyncSiteUuid)? {
            if site_uuid != site_info.id {
                return Err(Error::SiteUUIDIsBeingChanged(site_uuid, site_info.id));
            }
        }

        repo.set_string(
            KeyValueType::SettingsSyncSiteUuid,
            Some(site_info.id.clone()),
        )?;
        repo.set_i32(
            KeyValueType::SettingsSyncSiteId,
            Some(site_info.site_id.clone()),
        )?;

        info!("Received site info");

        Ok(site_info)
    }
}

#[async_trait]
impl SiteInfoTrait for SiteInfoService {
    async fn request_and_set_site_info(
        &self,
        service_provider: &ServiceProvider,
        settings: &SyncSettings,
    ) -> Result<(), RequestAndSetSiteInfoError> {
        match is_central_server() {
            true => {
                self.request_and_set_site_info_v5(service_provider, settings)
                    .await?;
            }
            false => {
                self.request_and_set_site_info_v7(service_provider, settings)
                    .await?;
            }
        };

        Ok(())
    }

    fn get_site_id(&self, ctx: &ServiceContext) -> Result<Option<i32>, RepositoryError> {
        let site_id = KeyValueStoreRepository::new(&ctx.connection)
            .get_i32(KeyValueType::SettingsSyncSiteId)?;

        Ok(site_id)
    }
}
