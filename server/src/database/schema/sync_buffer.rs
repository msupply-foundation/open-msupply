use super::diesel_schema::sync_buffer;

#[derive(Clone, Queryable, Insertable, Debug, PartialEq, Eq)]
#[table_name = "sync_buffer"]
pub struct SyncBufferRow {
    pub id: String,
    pub record: String,
}
