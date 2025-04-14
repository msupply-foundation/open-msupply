use log::info;
use repository::RepositoryError;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use util::format_error;

use crate::{
    programs::patient::patient_updated::create_patient_name_store_join,
    service_provider::ServiceProvider,
    sync::{
        api::{SyncApiSettings, SyncApiV5},
        CentralServerConfig,
    },
};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NameStoreJoinParams {
    pub id: String,
    pub name_id: String,
    pub store_id: String,
    pub sync_v5_settings: SyncApiSettings,
}

#[derive(Debug)]
pub struct SiteAuth {
    pub username: String,
    pub password_sha256: String,
}

#[derive(Deserialize, Debug, Error, Serialize)]
pub enum CentralApiError {
    #[error("Not a central server")]
    NotACentralServer,
    #[error("Not authorized")]
    NotAuthorized,
    #[error("Connection error: {0}")]
    ConnectionError(String),
    #[error("Internal error: {0}")]
    InternalError(String),
    #[error("Internal error: {0}")]
    LegacyServerError(String),
}

impl From<RepositoryError> for CentralApiError {
    fn from(from: RepositoryError) -> Self {
        CentralApiError::InternalError(format_error(&from))
    }
}

/// Creates/updates a name_store_join for a patient
pub async fn patient_name_store_join(
    service_provider: &ServiceProvider,
    NameStoreJoinParams {
        id,
        name_id,
        store_id,
        sync_v5_settings,
    }: NameStoreJoinParams,
) -> Result<(), CentralApiError> {
    if !CentralServerConfig::is_central_server() {
        return Err(CentralApiError::NotACentralServer);
    }

    let ctx = service_provider.basic_context()?;
    validate_auth(sync_v5_settings).await?;

    // Name link id will be created when patient is inserted
    // patient would have been inserted because remote site would send
    // patient to both OMS and OG central
    create_patient_name_store_join(&ctx.connection, &store_id, &name_id, Some(id))?;

    info!(
        "Created name_store_join for patient {} and store {}",
        name_id, store_id
    );

    Ok(())
}

// OMS Central does not yet do auth validation for site credentials
// So we call Legacy central server for this
// (Use sync API for simplest auth)
async fn validate_auth(sync_v5_settings: SyncApiSettings) -> Result<(), CentralApiError> {
    SyncApiV5::new(sync_v5_settings)
        .map_err(|e| CentralApiError::ConnectionError(format_error(&e)))?
        .get_site_info()
        .await
        .map_err(|e| CentralApiError::LegacyServerError(format_error(&e)))?;

    Ok(())
}
