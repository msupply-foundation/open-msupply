use super::diesel_schema::central_sync_buffer;

#[derive(Queryable, Insertable, Debug, PartialEq, Eq)]
#[table_name = "central_sync_buffer"]
pub struct CentralSyncBufferRow {
    pub id: String,
    pub cursor_id: i32,
    pub table_name: String,
    pub record_id: String,
    pub data: String,
}
