#[cfg(test)]
pub(crate) mod test;

mod actor;
pub(crate) mod api;
pub(crate) mod central_data_synchroniser;
pub(crate) mod remote_data_synchroniser;
pub mod settings;
mod sync_api_credentials;
mod sync_buffer;
mod sync_serde;
pub mod sync_status;
pub mod synchroniser;
pub(crate) mod translation_and_integration;
pub(crate) mod translations;

pub use sync_api_credentials::SyncCredentials;
use thiserror::Error;

#[derive(Error, Debug)]
#[error("Failed to translate {table_name} sync record: {record}")]
pub(crate) struct SyncTranslationError {
    pub table_name: String,
    pub source: anyhow::Error,
    pub record: String,
}
