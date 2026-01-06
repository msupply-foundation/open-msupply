use serde::{Deserialize, Serialize};
use thiserror::Error;

use super::*;
use crate::{
    diesel_macros::diesel_json_type, ChangelogTableName, RepositoryError, StorageConnection,
};

diesel_json_type! {
    #[derive(Debug, Error, Clone)]
    pub enum SyncError {
        #[error(transparent)]
        DatabaseError(#[from] RepositoryError),
         #[error("Error while serializing sync record: {0}")]
        SyncRecordSerializeError(#[from] SyncRecordSerializeError),
        #[error("Record not found with id '{id}' in table '{table}'")]
        RecordNotFound {
            id: String,
            table: ChangelogTableName
        },
        #[error("Sync V7 API version not compatible, minVersion: {0}, maxVersion: {1}, received: {2}")]
        SyncVersionMismatch(u32, u32, u32),
        #[error("Not a central server")]
        NotACentralServer,
        #[error("Could not authenticate")]
        Authentication,
        #[error(transparent)]
        SiteLockError(#[from] SiteLockError),
        #[error("Could not connect to server {url} {e}")]
        ConnectionError {
            url: reqwest::Url,
            e: String,
        },
        #[error("Could not parse response, {response_text}, error: {e}")]
        ParsingError { response_text: String, e: String },
        #[error("Integration timeout reached")]
        IntegrationTimeoutReached,
        #[error("Site id is not set")]
        SiteIdNotSet,
        #[error(transparent)]
        GetCurrentSiteIdError(#[from] GetCurrentSiteIdError),
        #[error("Site id mismatch, expected: {expected}, found: {found}")]
        SiteIdMismatch { expected: i32, found: i32 },
        #[error("Unmatched error {0}")]
        Other(String),
    }
}

#[derive(Error, Debug, Clone, Serialize, Deserialize)]
pub enum GetCurrentSiteIdError {
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error("Site id is not set in database")]
    SiteIdNotSet,
}

#[derive(Debug, Clone, Serialize, Deserialize, Error)]
pub enum SiteLockError {
    #[error("Integration in progress")]
    IntegrationInProgress,
}

#[derive(Debug, Clone, Serialize, Deserialize, Error)]
pub enum SyncRecordSerializeError {
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error(
        "Serialization error while processing sync record: {table_name}, with id: {id}, error: {e}"
    )]
    SerdeError {
        table_name: ChangelogTableName,
        id: String,
        e: String,
    },
    #[error("Record with id '{id}' not found in table '{table:?}'")]
    RecordNotFound {
        id: String,
        table: ChangelogTableName,
    },
}

pub trait SyncRecord: Send + Sync {
    fn serialize(
        &self,
        connection: &StorageConnection,
        table_name: &ChangelogTableName,
        id: &str,
    ) -> Result<Option<serde_json::Value>, SyncRecordSerializeError>;

    fn deserialize(
        &self,
        table_name: &ChangelogTableName,
        value: &serde_json::Value,
    ) -> Result<Option<Box<dyn Upsert>>, serde_json::Error>;

    fn sync_type(&self) -> &'static SyncType;
    fn table_name(&self) -> ChangelogTableName;
}
