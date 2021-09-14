use serde::{self, Deserialize, Serialize};
use std::fmt::{self, Debug, Display};

#[derive(Debug, Deserialize, Serialize)]
pub struct CentralSyncBatch {
    #[serde(rename = "maxCursor")]
    pub max_cursor: u32,
    pub data: Option<Vec<CentralSyncRecord>>,
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct CentralSyncRecord {
    #[serde(rename = "ID")]
    pub id: u32,
    #[serde(rename = "tableName")]
    pub table_name: String,
    #[serde(rename = "recordId")]
    pub record_id: String,
    pub data: CentralSyncRecordData,
}

impl Display for CentralSyncRecord {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
pub struct CentralSyncRecordData {
    #[serde(rename = "ID")]
    pub id: String,
}

impl Display for CentralSyncRecordData {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}
