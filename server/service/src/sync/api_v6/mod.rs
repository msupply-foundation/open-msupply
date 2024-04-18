mod core;
pub mod download_file;

use repository::RepositoryError;
use reqwest::Url;
use serde::{Deserialize, Serialize};
use thiserror::Error;
use util::format_error;

use crate::i64_to_u64;

pub use self::core::*;

use super::{
    api::{
        CommonSyncRecord, ParsedError, ParsingResponseError, SyncApiError, SyncApiErrorVariantV5,
        SyncApiSettings,
    },
    translations::PushSyncRecord,
};
use crate::sync::api::ParsingSyncRecordError;

#[derive(Deserialize, Debug, Error, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncParsedErrorV6 {
    #[error("Problem connecting to legacy server: {0}")]
    CannotConnectToLegacyServer(String),
    #[error(transparent)]
    LegacyServerError(#[from] ParsedError),
    #[error("Other legacy server error: {0}")]
    OtherLegacyServerError(String),
    #[error("Other server error: {0}")]
    OtherServerError(String),
    #[error("Not a central server")]
    NotACentralServer,
    #[error("Could not parse record to sync buffer row: {0}")]
    ParsingSyncRecordError(String),
}

impl From<anyhow::Error> for SyncParsedErrorV6 {
    fn from(from: anyhow::Error) -> Self {
        SyncParsedErrorV6::OtherServerError(from.to_string())
    }
}

impl SyncParsedErrorV6 {
    pub fn from_error<E: std::error::Error>(error: &E) -> Self {
        Self::OtherServerError(format_error(error))
    }
}

impl From<SyncApiError> for SyncParsedErrorV6 {
    fn from(from: SyncApiError) -> Self {
        use SyncApiErrorVariantV5 as FromError;
        use SyncParsedErrorV6 as ToError;

        let formated_error = format_error(&from);
        match from.source {
            FromError::ParsedError { source, .. } => ToError::LegacyServerError(source),
            FromError::ConnectionError(_) => ToError::CannotConnectToLegacyServer(formated_error),
            _ => ToError::OtherLegacyServerError(formated_error),
        }
    }
}

impl From<RepositoryError> for SyncParsedErrorV6 {
    fn from(from: RepositoryError) -> Self {
        SyncParsedErrorV6::OtherServerError(format_error(&from))
    }
}

impl From<ParsingSyncRecordError> for SyncParsedErrorV6 {
    fn from(from: ParsingSyncRecordError) -> Self {
        SyncParsedErrorV6::ParsingSyncRecordError(format_error(&from))
    }
}

#[derive(Deserialize, Debug, Default, Serialize)]
pub struct SyncPushSuccessV6 {
    pub(crate) records_pushed: u64,
}

#[derive(Deserialize, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncPushResponseV6 {
    Data(SyncPushSuccessV6),
    Error(SyncParsedErrorV6),
}

#[derive(Deserialize, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncPullResponseV6 {
    Data(SyncBatchV6),
    Error(SyncParsedErrorV6),
}

#[derive(Error, Debug)]
#[error("Sync api error, url: '{url}', route: '{route}'")]
pub struct SyncApiErrorV6 {
    pub source: SyncApiErrorVariantV6,
    pub(crate) url: Url,
    pub(crate) route: String,
}

#[derive(Error, Debug)]
pub enum SyncApiErrorVariantV6 {
    #[error("Connection problem")]
    ConnectionError(#[from] reqwest::Error),
    #[error("Could not parse response")]
    ParsedError(#[from] SyncParsedErrorV6),
    #[error("Could not parse response")]
    ParsingResponseError(#[from] ParsingResponseError),
    #[error("Unknown api error")]
    Other(#[source] anyhow::Error),
}

#[derive(Deserialize, Debug, Serialize)]
pub(crate) struct SyncRecordV6 {
    pub(crate) cursor: u64,
    pub(crate) record: CommonSyncRecord,
}
#[derive(Deserialize, Debug, Default, Serialize)]
pub struct SyncBatchV6 {
    // Latest changelog cursor in the 'records'
    // being pushed/pulled
    pub(crate) end_cursor: u64,
    // Number of records in changelog to pull/push
    // Including records in this batch
    pub(crate) total_records: u64,
    pub(crate) records: Vec<SyncRecordV6>,
}

impl From<PushSyncRecord> for SyncRecordV6 {
    fn from(PushSyncRecord { cursor, record }: PushSyncRecord) -> Self {
        SyncRecordV6 {
            cursor: i64_to_u64(cursor),
            record,
        }
    }
}
#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPullRequestV6 {
    pub(crate) cursor: u64,
    pub(crate) batch_size: u32,
    pub(crate) sync_v5_settings: SyncApiSettings,
    pub(crate) is_initialised: bool,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncPushRequestV6 {
    pub(crate) batch: SyncBatchV6,
    pub(crate) sync_v5_settings: SyncApiSettings,
}

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SyncDownloadFileRequestV6 {
    pub(crate) table_name: String,
    pub(crate) record_id: String,
    pub(crate) id: String,
    pub(crate) sync_v5_settings: SyncApiSettings,
}
