use super::diesel_schema::key_value_store;
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum KeyValueType {
    CentralSyncPullCursor,
    /// Indicates if the sync queue on the remote server has been initialised
    RemoteSyncQueueV5Initalised,
    /// Indicates if the remote data has been pulled and integrated from the central server
    /// Possible value: "true"
    RemoteSyncInitialSyncState,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Eq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "key_value_store"]
pub struct KeyValueStoreRow {
    pub id: KeyValueType,
    pub value_string: Option<String>,
}
