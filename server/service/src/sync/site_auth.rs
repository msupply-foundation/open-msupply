use super::api::{SyncApiError, SyncApiV5CreatingError};
use crate::{
    service_provider::{ServiceContext, ServiceProvider},
    sync::{
        api::SyncApiV5,
        settings::{SyncSettings, SYNC_V5_VERSION},
        CentralServerConfig,
    },
    sync_v7::api::get_token::{get_token, GetTokenInput},
};
use async_trait::async_trait;
use log::info;
use repository::{
    migrations::Version, syncv7::SyncError, KeyType, KeyValueStoreRepository, RepositoryError,
};
use thiserror::Error;
use util::format_error;

pub struct SiteAuth {
    pub site_id: i32,
    pub central_site_id: i32,
}

#[derive(Error)]
pub enum RequestAndSetSiteAuthError {
    #[error("Api error while requesting site auth")]
    RequestSiteAuthError(#[from] SyncApiError),
    #[error("Sync v7 error while requesting site auth")]
    SyncV7Error(#[from] SyncError),
    #[error("Database error while requesting site auth")]
    DatabaseError(#[from] RepositoryError),
    #[error("Attempt to change initialised site, UUID does not match: current ({0}) new ({1}")]
    SiteUUIDIsBeingChanged(String, String),
    #[error("Error while requesting and setting site auth")]
    SyncApiV5CreatingError(#[from] SyncApiV5CreatingError),
    #[error("Could not read hardware id: {0}")]
    HardwareIdError(String),
    #[error("Invalid sync url: {0}")]
    InvalidUrl(String),
}

// For unwrap and expect debug implementation is used
impl std::fmt::Debug for RequestAndSetSiteAuthError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", format_error(self))
    }
}

#[async_trait]
pub trait SiteAuthTrait: Sync + Send {
    async fn request_and_set_site_auth(
        &self,
        service_provider: &ServiceProvider,
        settings: &SyncSettings,
    ) -> Result<SiteAuth, RequestAndSetSiteAuthError>;
    fn get_site_id(&self, ctx: &ServiceContext) -> Result<Option<i32>, RepositoryError>;
}

pub struct SiteAuthService;

#[async_trait]
impl SiteAuthTrait for SiteAuthService {
    async fn request_and_set_site_auth(
        &self,
        service_provider: &ServiceProvider,
        settings: &SyncSettings,
    ) -> Result<SiteAuth, RequestAndSetSiteAuthError> {
        let ctx = service_provider.basic_context()?;
        let repo = KeyValueStoreRepository::new(&ctx.connection);

        if CentralServerConfig::is_central_server() {
            request_and_set_site_auth_v5(service_provider, settings, &repo).await
        } else {
            request_and_set_site_auth_v7(service_provider, settings, &repo).await
        }
    }

    fn get_site_id(&self, ctx: &ServiceContext) -> Result<Option<i32>, RepositoryError> {
        let site_id =
            KeyValueStoreRepository::new(&ctx.connection).get_i32(KeyType::SettingsSyncSiteId)?;

        Ok(site_id)
    }
}

async fn request_and_set_site_auth_v5(
    service_provider: &ServiceProvider,
    settings: &SyncSettings,
    repo: &KeyValueStoreRepository<'_>,
) -> Result<SiteAuth, RequestAndSetSiteAuthError> {
    use RequestAndSetSiteAuthError as Error;

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
        Some(site_info.msupply_central_site_id),
    )?;

    info!("Received site info (v5)");
    Ok(SiteAuth {
        site_id: site_info.site_id,
        central_site_id: site_info.msupply_central_site_id,
    })
}

async fn request_and_set_site_auth_v7(
    service_provider: &ServiceProvider,
    settings: &SyncSettings,
    repo: &KeyValueStoreRepository<'_>,
) -> Result<SiteAuth, RequestAndSetSiteAuthError> {
    use RequestAndSetSiteAuthError as Error;

    let hardware_id = service_provider
        .app_data_service
        .get_hardware_id()
        .map_err(|e| Error::HardwareIdError(format_error(&e)))?;

    let base_url = settings
        .url
        .parse::<reqwest::Url>()
        .map_err(|e| Error::InvalidUrl(format_error(&e)))?;

    info!("Requesting auth token (v7)");
    let output = get_token(
        &base_url,
        GetTokenInput {
            version: Version::from_package_json(),
            name: settings.username.clone(),
            password_sha256: settings.password_sha256.clone(),
            hardware_id,
        },
    )
    .await?;

    repo.set_string(KeyType::SettingsSyncV7Token, Some(output.token.clone()))?;
    repo.set_i32(KeyType::SettingsSyncSiteId, Some(output.site_id))?;
    repo.set_i32(
        KeyType::SettingsSyncCentralServerSiteId,
        Some(output.central_site_id),
    )?;

    info!("Received auth token (v7) for site {}", output.site_id);

    Ok(SiteAuth {
        site_id: output.site_id,
        central_site_id: output.central_site_id,
    })
}
