use super::*;
use crate::{
    diesel_macros::diesel_json_type, ChangeLogInsertRowV7, ChangelogTableName, RepositoryError,
    StorageConnection,
};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use thiserror::Error;
use ts_rs::TS;

diesel_json_type! {
    #[derive(Debug, Error, Clone, TS)]
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
            url: String,
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

#[derive(Error, Debug, Clone, Serialize, Deserialize, TS)]
pub enum GetCurrentSiteIdError {
    #[error(transparent)]
    DatabaseError(#[from] RepositoryError),
    #[error("Site id is not set in database")]
    SiteIdNotSet,
}

#[derive(Debug, Clone, Serialize, Deserialize, Error, TS)]
pub enum SiteLockError {
    #[error("Integration in progress")]
    IntegrationInProgress,
}

#[derive(Debug, Clone, Serialize, Deserialize, Error, TS)]
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

pub trait SyncRecord: Record + Serialize + DeserializeOwned {
    fn table_name() -> &'static ChangelogTableName;
    fn sync_type() -> &'static SyncType;
    fn changelog_extra(
        &self,
        connection: &StorageConnection,
    ) -> Result<Option<ChangeLogInsertRowV7>, RepositoryError>;
}

pub trait BoxableSyncRecord: Send + Sync {
    fn serialize(
        &self,
        connection: &StorageConnection,
        table_name: &ChangelogTableName,
        id: &str,
    ) -> Result<Option<serde_json::Value>, SyncRecordSerializeError>;

    fn deserialize(&self, value: &serde_json::Value) -> Result<Box<dyn Upsert>, serde_json::Error>;

    fn sync_type(&self) -> &'static SyncType;
    fn table_name(&self) -> ChangelogTableName;
}

/// Macro to implement SyncRecord trait and Translator for central sync records
///
/// This macro generates:
/// 1. SyncRecord trait implementation with Central sync type
/// 2. A Translator struct implementing TranslatorTrait
/// 3. A registration function using ctor to add the translator to global visitors
///
/// Usage:
/// ```
/// impl_central_sync_record!(MyRow, ChangelogTableName::MyTable);
/// ```
#[macro_export]
macro_rules! impl_central_sync_record {
    ($struct_name:ident, $table_name:expr) => {
        impl $crate::syncv7::SyncRecord for $struct_name {
            fn table_name() -> &'static $crate::ChangelogTableName {
                &$table_name
            }

            fn sync_type() -> &'static $crate::syncv7::SyncType {
                &$crate::syncv7::SyncType::Central
            }

            fn changelog_extra(
                &self,
                _connection: &$crate::StorageConnection,
            ) -> Result<Option<$crate::ChangeLogInsertRowV7>, $crate::RepositoryError> {
                Ok(None)
            }
        }
    };
}

pub(crate) use impl_central_sync_record;
