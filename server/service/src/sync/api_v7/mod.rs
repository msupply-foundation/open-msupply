mod core;
use repository::RepositoryError;
use reqwest::{Response, Url};
use serde::{de::DeserializeOwned, Deserialize, Serialize};
use thiserror::Error;
use util::format_error;

use crate::i64_to_u64;

pub use self::core::*;

use super::{
    api::{CommonSyncRecord, ParsingResponseError},
    translations::PushSyncRecord,
};
use crate::sync::api::ParsingSyncRecordError;

#[derive(Deserialize, Debug, Error, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncParsedErrorV7 {
    #[error("Other server error: {0}")]
    OtherServerError(String),
    #[error("Not a central server")]
    NotACentralServer,
    #[error("Could not parse record to sync buffer row: {0}")]
    ParsingSyncRecordError(String),
    #[error("Integration in progress")]
    IntegrationInProgress,
    #[error("Sync file not found, file_id: {0}")]
    SyncFileNotFound(String),
}

impl From<anyhow::Error> for SyncParsedErrorV7 {
    fn from(from: anyhow::Error) -> Self {
        SyncParsedErrorV7::OtherServerError(from.to_string())
    }
}

impl SyncParsedErrorV7 {
    pub fn from_error<E: std::error::Error>(error: &E) -> Self {
        Self::OtherServerError(format_error(error))
    }
}

impl From<RepositoryError> for SyncParsedErrorV7 {
    fn from(from: RepositoryError) -> Self {
        SyncParsedErrorV7::OtherServerError(format_error(&from))
    }
}

impl From<ParsingSyncRecordError> for SyncParsedErrorV7 {
    fn from(from: ParsingSyncRecordError) -> Self {
        SyncParsedErrorV7::ParsingSyncRecordError(format_error(&from))
    }
}

#[derive(Deserialize, Debug, Default, Serialize)]
pub struct SyncPushSuccessV7 {
    pub(crate) records_pushed: u64,
}

#[derive(Deserialize, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncPushResponseV7 {
    Data(SyncPushSuccessV7),
    Error(SyncParsedErrorV7),
}

#[derive(Deserialize, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncPullResponseV7 {
    Data(SyncBatchV7),
    Error(SyncParsedErrorV7),
}

#[derive(Deserialize, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SiteStatusResponseV7 {
    Data(SiteStatusV7),
    Error(SyncParsedErrorV7),
}

#[derive(Error, Debug)]
#[error("Sync api error, url: '{url}', route: '{route}'")]
pub struct SyncApiErrorV7 {
    pub source: SyncApiErrorVariantV7,
    pub(crate) url: Url,
    pub(crate) route: String,
}

#[derive(Error, Debug)]
pub enum SyncApiErrorVariantV7 {
    #[error("Connection problem")]
    ConnectionError(#[from] reqwest::Error),
    #[error("Could not parse response")]
    ParsedError(#[from] SyncParsedErrorV7),
    #[error("Could not parse response")]
    ParsingResponseError(#[from] ParsingResponseError),
    #[error("Unknown api error")]
    Other(#[from] anyhow::Error),
}

#[derive(Deserialize, Debug, Serialize)]
pub(crate) struct SyncRecordV7 {
    pub(crate) cursor: u64,
    pub(crate) record: CommonSyncRecord,
}
#[derive(Deserialize, Debug, Default, Serialize)]
pub struct SyncBatchV7 {
    // Latest changelog cursor in the 'records'
    // being pushed/pulled
    pub(crate) end_cursor: u64,
    // Number of records in changelog to pull/push
    // Including records in this batch
    pub(crate) total_records: u64,
    pub(crate) records: Vec<SyncRecordV7>,
    pub(crate) is_last_batch: bool,
}

impl From<PushSyncRecord> for SyncRecordV7 {
    fn from(PushSyncRecord { cursor, record }: PushSyncRecord) -> Self {
        SyncRecordV7 {
            cursor: i64_to_u64(cursor),
            record,
        }
    }
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct SyncV7Settings {
    pub sync_version: u32,
    pub username: String,
    pub password: String, // passing around plain text bc yolo?
}

#[derive(Serialize, Deserialize)]
pub struct SyncRequestV7<T> {
    pub common: SyncV7Settings,
    pub data: T,
}

#[derive(Serialize, Deserialize)]
pub struct PullPayload {
    pub(crate) cursor: u64,
    pub(crate) batch_size: u32,
    pub(crate) is_initialised: bool,
}

#[derive(Serialize, Deserialize)]
pub struct PushPayload {
    pub(crate) batch: SyncBatchV7,
}

#[derive(Debug, PartialEq, Serialize, Deserialize)]
pub struct SiteStatusV7 {
    pub(crate) is_integrating: bool,
}

#[derive(Serialize, Deserialize)]
pub struct DownloadFilePayload {
    pub(crate) table_name: String,
    pub(crate) record_id: String,
    pub(crate) id: String,
}

#[derive(Serialize, Deserialize)]
pub struct UploadFilePayload {
    pub file_id: String,
}

pub type SiteStatusRequestV7 = SyncRequestV7<()>;
pub type SyncPushRequestV7 = SyncRequestV7<PushPayload>;
pub type SyncPullRequestV7 = SyncRequestV7<PullPayload>;
pub type SyncDownloadFileRequestV7 = SyncRequestV7<DownloadFilePayload>;
pub type SyncUploadFileRequestV7 = SyncRequestV7<UploadFilePayload>;

#[derive(Deserialize, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncUploadFileResponseV7 {
    Data(()),
    Error(SyncParsedErrorV7),
}

async fn response_or_err<T: DeserializeOwned>(
    result: Result<Response, reqwest::Error>,
) -> Result<T, SyncApiErrorVariantV7> {
    let response = match result {
        Ok(result) => result,
        Err(error) => {
            if error.is_connect() {
                return Err(SyncApiErrorVariantV7::ConnectionError(error));
            } else {
                return Err(SyncApiErrorVariantV7::Other(error.into()));
            }
        }
    };

    // Not checking for status, expecting 200 only, even if there is error
    let response_text = response
        .text()
        .await
        .map_err(ParsingResponseError::CannotGetTextResponse)?;

    let result = serde_json::from_str(&response_text).map_err(|source| {
        ParsingResponseError::ParseError {
            source,
            response_text,
        }
    })?;

    Ok(result)
}
