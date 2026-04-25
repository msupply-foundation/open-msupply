use super::api::{SyncApiError, SyncApiV5CreatingError};
use crate::{
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        api::{SiteInfoV5, SyncApiV5},
        settings::{SyncSettings, SYNC_V5_VERSION},
        CentralServerConfig,
    },
    sync_v7::api::{
        self as api_v7,
        site_info::{get_site_info, SiteInfoInput, SiteInfoOutput},
        status::Output,
        VERSION as V7_VERSION,
    },
};
use async_trait::async_trait;
use log::info;
use repository::{syncv7::SyncError, KeyType, KeyValueStoreRepository, RepositoryError};
use thiserror::Error;
use util::format_error;

pub enum SiteInfo {
    V5(SiteInfoV5),
    V7(api_v7::status::Output),
}

#[derive(Error)]
pub enum RequestAndSetSiteInfoError {
    #[error("Api error while requesting site info")]
    RequestSiteInfoError(#[from] SyncApiError),
    #[error("Sync v7 error while requesting site info")]
    SyncV7Error(#[from] SyncError),
    #[error("Database error while requesting site info")]
    DatabaseError(#[from] RepositoryError),
    #[error("Attempt to change initialised site, UUID does not match: current ({0}) new ({1}")]
    SiteUUIDIsBeingChanged(String, String),
    #[error("Error while requesting and setting site info")]
    SyncApiV5CreatingError(#[from] SyncApiV5CreatingError),
    #[error("Could not read hardware id: {0}")]
    HardwareIdError(String),
    #[error("Invalid sync url: {0}")]
    InvalidUrl(String),
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
        let ctx = service_provider.basic_context()?;
        let repo = KeyValueStoreRepository::new(&ctx.connection);

        if CentralServerConfig::is_central_server() {
            request_and_set_site_info_v5(service_provider, settings, &repo).await
        } else {
            request_and_set_site_info_v7(service_provider, settings, &repo).await
        }
    }

    fn get_site_id(&self, ctx: &ServiceContext) -> Result<Option<i32>, RepositoryError> {
        let site_id =
            KeyValueStoreRepository::new(&ctx.connection).get_i32(KeyType::SettingsSyncSiteId)?;

        Ok(site_id)
    }
}

async fn request_and_set_site_info_v5(
    service_provider: &ServiceProvider,
    settings: &SyncSettings,
    repo: &KeyValueStoreRepository<'_>,
) -> Result<SiteInfo, RequestAndSetSiteInfoError> {
    use RequestAndSetSiteInfoError as Error;

    let sync_api_v5 = SyncApiV5::new(SyncApiV5::new_settings(
        settings,
        service_provider,
        SYNC_V5_VERSION,
    )?)?;

    info!("Requesting site info (v5)");
    let site_info = sync_api_v5.get_site_info().await?;

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

    info!("Received site info (v5)");
    Ok(SiteInfo::V5(site_info))
}

async fn request_and_set_site_info_v7(
    service_provider: &ServiceProvider,
    settings: &SyncSettings,
    repo: &KeyValueStoreRepository<'_>,
) -> Result<SiteInfo, RequestAndSetSiteInfoError> {
    use RequestAndSetSiteInfoError as Error;

    let hardware_id = service_provider
        .app_data_service
        .get_hardware_id()
        .map_err(|e| Error::HardwareIdError(format_error(&e)))?;

    let base_url = settings
        .url
        .parse::<reqwest::Url>()
        .map_err(|e| Error::InvalidUrl(format_error(&e)))?;

    info!("Requesting site info (v7)");
    let output = get_site_info(
        &base_url,
        SiteInfoInput {
            version: V7_VERSION,
            name: settings.username.clone(),
            password_sha256: settings.password_sha256.clone(),
            hardware_id,
        },
    )
    .await?;

    save_v7_token_to_key_value(repo, &output)?;
    info!("Received site info (v7) for site {}", output.site_id);

    Ok(SiteInfo::V7(Output {
        site_id: output.site_id,
        central_site_id: output.central_site_id,
    }))
}

fn save_v7_token_to_key_value(
    repo: &KeyValueStoreRepository<'_>,
    output: &SiteInfoOutput,
) -> Result<(), RepositoryError> {
    repo.set_string(KeyType::SettingsSyncTokenV7, Some(output.token.clone()))?;
    repo.set_i32(KeyType::SettingsSyncSiteId, Some(output.site_id))?;
    repo.set_i32(
        KeyType::SettingsSyncCentralServerSiteId,
        Some(output.central_site_id),
    )?;
    Ok(())
}
