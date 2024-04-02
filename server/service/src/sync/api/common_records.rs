use chrono::Utc;
use repository::{SyncBufferAction, SyncBufferRow};
use serde::{Deserialize, Serialize};
use serde_json::json;
use thiserror::Error;
use util::uuid::uuid;

fn empty_object() -> serde_json::Value {
    json!({})
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
pub(crate) struct CommonSyncRecordV5 {
    #[serde(rename = "tableName")]
    pub(crate) table_name: String,
    #[serde(rename = "recordId")]
    pub(crate) record_id: String,
    pub(crate) action: SyncActionV5,
    /// Not set when record is deleted
    #[serde(rename = "recordData")]
    #[serde(default = "empty_object")]
    pub(crate) data: serde_json::Value,
}

#[derive(Debug, Deserialize, PartialEq, Serialize)]
pub(crate) struct RemoteSyncRecordV5 {
    #[serde(rename = "syncOutId")]
    pub(crate) sync_id: String,
    #[serde(flatten)]
    pub(crate) record: CommonSyncRecordV5,
}

#[derive(Debug, Deserialize, PartialEq, Serialize)]
pub(crate) struct RemoteSyncBatchV5 {
    #[serde(rename = "queueLength")]
    pub(crate) queue_length: u64,
    #[serde(default)]
    pub(crate) data: Vec<RemoteSyncRecordV5>,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
pub(crate) enum SyncActionV5 {
    #[serde(alias = "insert")]
    Insert,
    #[serde(alias = "update")]
    Update,
    #[serde(alias = "delete")]
    Delete,
    #[serde(alias = "merge")]
    Merge,
}

impl SyncActionV5 {
    fn to_row_action(&self) -> SyncBufferAction {
        match self {
            SyncActionV5::Insert => SyncBufferAction::Upsert,
            SyncActionV5::Update => SyncBufferAction::Upsert,
            SyncActionV5::Delete => SyncBufferAction::Delete,
            SyncActionV5::Merge => SyncBufferAction::Merge,
        }
    }
}

#[derive(Error, Debug)]
#[error("Failed to parse V5 remote record into sync buffer row, record: '{record:?}'")]
pub(crate) struct ParsingV5RecordError {
    source: serde_json::Error,
    record: serde_json::Value,
}

impl CommonSyncRecordV5 {
    pub(crate) fn to_buffer_row(self) -> Result<SyncBufferRow, ParsingV5RecordError> {
        let CommonSyncRecordV5 {
            table_name,
            record_id,
            action,
            data,
        } = self;

        let record_id = if action == SyncActionV5::Merge {
            // This is (likely) a temporary fix to avoid merge sync records overriding upserts on target table
            // causing errors as the merge is applied to record that never got upserted first.
            uuid()
        } else {
            record_id
        };

        Ok(SyncBufferRow {
            table_name,
            record_id,
            action: action.to_row_action(),
            data: serde_json::to_string(&data).map_err(|e| ParsingV5RecordError {
                source: e,
                record: data.clone(),
            })?,
            received_datetime: Utc::now().naive_utc(),
            integration_datetime: None,
            integration_error: None,
        })
    }
}

impl RemoteSyncBatchV5 {
    pub(crate) fn extract_sync_ids(&self) -> Vec<String> {
        self.data.iter().map(|r| r.sync_id.clone()).collect()
    }

    pub(crate) fn to_sync_buffer_rows(self) -> Result<Vec<SyncBufferRow>, ParsingV5RecordError> {
        self.data
            .into_iter()
            .map(|r| Ok(r.record.to_buffer_row()?))
            .collect()
    }
}

#[cfg(test)]
impl CommonSyncRecordV5 {
    pub(crate) fn test() -> Self {
        Self {
            table_name: "test".to_string(),
            record_id: "test".to_string(),
            action: SyncActionV5::Delete,
            data: json!({}),
        }
    }
}
