use chrono::Utc;
use repository::{SyncBufferAction, SyncBufferRow};
use serde::{Deserialize, Serialize};
use serde_json::json;
use thiserror::Error;

fn empty_object() -> serde_json::Value {
    json!({})
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct CommonSyncRecord {
    pub(crate) table_name: String,
    pub(crate) record_id: String,
    pub(crate) action: SyncAction,
    /// Not set when record is deleted
    #[serde(default = "empty_object")]
    pub(crate) record_data: serde_json::Value,
}

#[derive(Debug, Deserialize, PartialEq, Serialize)]
pub(crate) struct RemoteSyncRecordV5 {
    #[serde(rename = "syncOutId")]
    pub(crate) sync_id: String,
    #[serde(flatten)]
    pub(crate) record: CommonSyncRecord,
}

#[derive(Debug, Deserialize, PartialEq, Serialize)]
pub(crate) struct RemoteSyncBatchV5 {
    #[serde(rename = "queueLength")]
    pub(crate) queue_length: u64,
    #[serde(default)]
    pub(crate) data: Vec<RemoteSyncRecordV5>,
}

#[derive(Clone, Debug, PartialEq, Deserialize, Serialize)]
pub(crate) enum SyncAction {
    #[serde(alias = "insert")]
    Insert,
    #[serde(alias = "update")]
    Update,
    #[serde(alias = "delete")]
    Delete,
    #[serde(alias = "merge")]
    Merge,
}

impl SyncAction {
    fn to_row_action(&self) -> SyncBufferAction {
        match self {
            SyncAction::Insert => SyncBufferAction::Upsert,
            SyncAction::Update => SyncBufferAction::Upsert,
            SyncAction::Delete => SyncBufferAction::Delete,
            SyncAction::Merge => SyncBufferAction::Merge,
        }
    }
}

#[derive(Error, Debug)]
#[error("Failed to parse sync record into sync buffer row, record: '{record:?}'")]
pub(crate) struct ParsingSyncRecordError {
    source: serde_json::Error,
    record: serde_json::Value,
}

impl CommonSyncRecord {
    pub(crate) fn to_buffer_row(self) -> Result<SyncBufferRow, ParsingSyncRecordError> {
        let CommonSyncRecord {
            table_name,
            record_id,
            action,
            record_data: data,
        } = self;
        Ok(SyncBufferRow {
            table_name,
            record_id,
            action: action.to_row_action(),
            data: serde_json::to_string(&data).map_err(|e| ParsingSyncRecordError {
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

    pub(crate) fn to_sync_buffer_rows(self) -> Result<Vec<SyncBufferRow>, ParsingSyncRecordError> {
        self.data
            .into_iter()
            .map(|r| Ok(r.record.to_buffer_row()?))
            .collect()
    }
}

#[cfg(test)]
impl CommonSyncRecord {
    pub(crate) fn test() -> Self {
        Self {
            table_name: "test".to_string(),
            record_id: "test".to_string(),
            action: SyncAction::Delete,
            record_data: json!({}),
        }
    }
}
