use super::diesel_schema::key_value_store;
use diesel_derive_enum::DbEnum;

#[derive(DbEnum, Debug, Clone, PartialEq, Eq)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum KeyValueType {
    CentralSyncPullCursor,
    /// Indicates if the sync queue on the remote server has been initialised
    RemoteSyncInitilisationStarted,
    /// Indicates if the remote data has been pulled and integrated from the central server
    /// Possible value: "true"
    RemoteSyncInitilisationFinished,
    RemoteSyncPushCursor,

    SettingsSyncUrl,
    SettingsSyncUsername,
    SettingsSyncPasswordSha256,
    SettingsSyncIntervalSec,
    SettingsSyncCentralServerSiteId,
    SettingsSyncSideId,
    SettingsSyncSideHardwareId,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "key_value_store"]
pub struct KeyValueStoreRow {
    pub id: KeyValueType,
    pub value_string: Option<String>,
    pub value_int: Option<i32>,
    pub value_bigint: Option<i64>,
    pub value_float: Option<f64>,
    pub value_bool: Option<bool>,
}
