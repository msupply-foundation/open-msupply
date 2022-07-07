mod actor;
pub mod central_data_synchroniser;
mod init_programs_data;
pub mod remote_data_synchroniser;
pub mod settings;
mod sync_serde;
mod synchroniser;
mod translation_central;
mod translation_remote;

#[cfg(test)]
mod integration_tests;

pub use actor::{get_sync_actors, SyncReceiverActor, SyncSenderActor};
use repository::RepositoryError;
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
    #[error("Failed to integrate sync records: {extra}, {source}")]
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
