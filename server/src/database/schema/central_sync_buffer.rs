use super::diesel_schema::central_sync_buffer;

use serde::{self, Deserialize, Serialize};
use std::fmt::{self, Debug, Display};

#[derive(Clone, Queryable, Deserialize, Serialize, Insertable, Debug, PartialEq, Eq)]
#[table_name = "central_sync_buffer"]
pub struct CentralSyncBufferRow {
    #[serde(rename = "ID")]
    pub id: String,
    #[serde(rename = "ID")]
    pub cursor_id: i32,
    #[serde(rename = "tableName")]
    pub table_name: String,
    #[serde(rename = "recordId")]
    pub record_id: String,
    pub data: String,
}

impl Display for CentralSyncBufferRow {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}
