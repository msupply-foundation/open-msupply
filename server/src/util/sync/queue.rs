use serde::{self, Deserialize, Serialize};
use std::fmt::{self, Debug, Display};

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncQueueBatch {
    #[serde(rename = "queueLength")]
    pub queue_length: u32,
    pub data: Option<Vec<SyncQueueRecord>>,
}

impl SyncQueueBatch {
    pub fn next(&mut self) -> Option<SyncQueueRecord> {
        match &mut self.data {
            Some(data) => data.pop(),
            _ => None,
        }
    }
}

impl Display for SyncQueueBatch {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct SyncQueueRecord {
    #[serde(rename = "syncID")]
    pub sync_id: String,
    pub action: SyncQueueRecordAction,
    pub data: SyncQueueRecordData,
}

impl Display for SyncQueueRecord {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum SyncQueueRecordAction {
    #[serde(alias = "create")]
    Create,
    #[serde(alias = "update")]
    Update,
    #[serde(alias = "delete")]
    Delete,
    #[serde(alias = "merge")]
    Merge,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct SyncQueueRecordData {
    #[serde(rename = "ID")]
    pub id: String,
}

impl Display for SyncQueueRecordData {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct SyncQueueAcknowledgement {
    #[serde(rename = "syncIDs")]
    pub sync_ids: Vec<String>,
}

impl Display for SyncQueueAcknowledgement {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}
