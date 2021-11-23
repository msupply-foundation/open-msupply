use serde::{self, Deserialize, Serialize};
use std::fmt::{self, Debug, Display};

#[derive(Debug, Deserialize, Serialize)]
pub struct RemoteSyncBatch {
    #[serde(rename = "queueLength")]
    pub queue_length: u32,
    pub data: Option<Vec<RemoteSyncRecord>>,
}

impl RemoteSyncBatch {
    pub fn next(&mut self) -> Option<RemoteSyncRecord> {
        match &mut self.data {
            Some(data) => data.pop(),
            _ => None,
        }
    }
}

impl Display for RemoteSyncBatch {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct RemoteSyncRecord {
    #[serde(rename = "syncID")]
    pub sync_id: String,
    pub action: RemoteSyncRecordAction,
    pub data: RemoteSyncRecordData,
}

impl Display for RemoteSyncRecord {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub enum RemoteSyncRecordAction {
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
pub struct RemoteSyncRecordData {
    #[serde(rename = "ID")]
    pub id: String,
}

impl Display for RemoteSyncRecordData {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Debug, Deserialize, Serialize)]
pub struct RemoteSyncAcknowledgement {
    #[serde(rename = "syncIDs")]
    pub sync_ids: Vec<String>,
}

impl Display for RemoteSyncAcknowledgement {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}
