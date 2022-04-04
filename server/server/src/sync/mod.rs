mod actor;
mod central_data_synchroniser;
mod remote_data_synchroniser;
mod sync_api_credentials;
mod sync_api_v3;
mod sync_api_v5;
mod synchroniser;
mod translation_central;
mod translation_remote;

#[cfg(test)]
mod integration_tests;

pub use actor::{get_sync_actors, SyncReceiverActor, SyncSenderActor};
use repository::RepositoryError;
pub use sync_api_credentials::SyncCredentials;
pub use sync_api_v5::{SyncApiV5, SyncConnectionError};
pub use synchroniser::Synchroniser;

use thiserror::Error;

#[derive(Error, Debug)]
#[error("Failed to translate {table_name} sync record: {record}")]
pub struct SyncTranslationError {
    pub table_name: String,
    pub source: anyhow::Error,
    pub record: String,
}

#[derive(Error, Debug)]
pub enum SyncImportError {
    #[error("Failed to translate sync records")]
    TranslationError {
        #[from]
        source: SyncTranslationError,
    },
    #[error("Failed to integrate sync records")]
    IntegrationError {
        source: RepositoryError,
        extra: String,
    },
}

impl SyncImportError {
    pub fn as_integration_error<T: std::fmt::Debug>(error: RepositoryError, extra: T) -> Self {
        SyncImportError::IntegrationError {
            source: error,
            extra: format!("{:?}", extra),
        }
    }
}
