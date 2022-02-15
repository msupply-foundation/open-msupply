use super::diesel_schema::central_sync_buffer;

use std::fmt::{self, Debug, Display};

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq)]
#[table_name = "central_sync_buffer"]
pub struct CentralSyncBufferRow {
    pub id: i32,
    pub table_name: String,
    pub record_id: String,
    pub data: String,
}

impl Display for CentralSyncBufferRow {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?}", self)
    }
}
