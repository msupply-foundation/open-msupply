use super::diesel_schema::central_sync_buffer;

use serde::{self, Deserialize, Deserializer, Serialize};
use std::fmt::{self, Debug, Display};

#[derive(Clone, Queryable, Deserialize, Serialize, Insertable, Debug, PartialEq, Eq)]
#[table_name = "central_sync_buffer"]
pub struct CentralSyncBufferRow {
    #[serde(rename = "ID")]
    pub id: i32,
    #[serde(rename = "tableName")]
    pub table_name: String,
    #[serde(rename = "recordId")]
    pub record_id: String,
    #[serde(deserialize_with = "map_as_string")]
    pub data: String,
}

fn map_as_string<'de, D>(deserializer: D) -> Result<String, D::Error>
where
    D: Deserializer<'de>,
{
    serde_json::to_string_pretty(&serde_json::Value::deserialize(deserializer)?)
        .map_err(|err| serde::de::Error::custom(err.to_string()))
}

impl Display for CentralSyncBufferRow {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}
