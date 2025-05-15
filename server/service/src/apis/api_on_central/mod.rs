use repository::{KeyType, KeyValueStoreRepository, RepositoryError};
use serde::{Deserialize, Serialize};
use thiserror::Error;
use util::format_error;

use crate::{
    service_provider::{ServiceContext, ServiceProvider},
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
