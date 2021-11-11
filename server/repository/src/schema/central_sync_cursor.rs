use super::diesel_schema::central_sync_cursor;

#[derive(Queryable, Insertable, Debug, PartialEq, Eq)]
#[table_name = "central_sync_cursor"]
pub struct CentralSyncCursorRow {
    pub id: i32,
}
