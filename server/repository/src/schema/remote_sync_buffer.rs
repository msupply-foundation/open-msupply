use super::diesel_schema::remote_sync_buffer;
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum RemoteSyncBufferAction {
    Create,
    Update,
    Delete,
    Merge,
}

#[derive(Clone, Queryable, AsChangeset, Insertable, Debug, PartialEq, Eq)]
#[table_name = "remote_sync_buffer"]
pub struct RemoteSyncBufferRow {
    /// the sync id
    pub id: String,
    pub table_name: String,
    pub record_id: String,
    pub action: RemoteSyncBufferAction,
    pub data: String,
}
