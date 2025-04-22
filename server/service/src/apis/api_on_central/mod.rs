use repository::RepositoryError;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use util::format_error;

use crate::{
    service_provider::ServiceProvider,
    sync::api::{SyncApiSettings, SyncApiV5},
};

mod patient_name_store_join;

pub use patient_name_store_join::{add_patient_name_store_join, NameStoreJoinParams};

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
    name_store_join_params: NameStoreJoinParams,
) -> Result<(), CentralApiError> {
    add_patient_name_store_join(service_provider, name_store_join_params).await
}

// OMS Central does not yet do auth validation for site credentials
// So we call Legacy central server for this
// (Use sync API for simplest auth)
async fn validate_site_auth(sync_v5_settings: SyncApiSettings) -> Result<(), CentralApiError> {
    SyncApiV5::new(sync_v5_settings)
        .map_err(|e| CentralApiError::ConnectionError(format_error(&e)))?
        .get_site_info()
        .await
        .map_err(|e| CentralApiError::LegacyServerError(format_error(&e)))?;

    Ok(())
}
