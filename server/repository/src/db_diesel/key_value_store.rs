use diesel::prelude::*;

use super::StorageConnection;
use crate::repository_error::RepositoryError;

use diesel_derive_enum::DbEnum;

table! {
    key_value_store (id) {
        id -> crate::db_diesel::key_value_store::KeyTypeMapping,
        value_string -> Nullable<Text>,
        value_int-> Nullable<Integer>,
        value_bigint-> Nullable<BigInt>,
        value_float-> Nullable<Double>,
        value_bool-> Nullable<Bool>,
    }
}

// Database:  https://github.com/openmsupply/open-msupply/blob/d6645711184c63593949c3e8b6dc96b5a5ded39f/server/repository/migrations/postgres/2022-02-11T15-00_create_key_value_store/up.sql#L2-L16
#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Default)]
#[cfg_attr(test, derive(strum::EnumIter))]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum KeyType {
    #[default]
    CentralSyncPullCursor,
    SyncPullCursorV6,
    SyncPushCursorV6,
    RemoteSyncPushCursor,
    ShipmentTransferProcessorCursor,
    RequisitionTransferProcessorCursor,
    ContactFormProcessorCursor,
    LoadPluginProcessorCursor,

    SettingsSyncUrl,
    SettingsSyncUsername,
    SettingsSyncPasswordSha256,
    SettingsSyncIntervalSeconds,
    SettingsSyncCentralServerSiteId,
    SettingsSyncSiteId,
    SettingsSyncSiteUuid,
    SettingsSyncIsDisabled,
    SettingsTokenSecret,

    DatabaseVersion,

    SettingsDisplayCustomLogo,
    SettingsDisplayCustomLogoHash,
    SettingsDisplayCustomTheme,
    SettingsDisplayCustomThemeHash,
    SettingsLabelPrinter,

    LogLevel,
    LogDirectory,
    LogFileName,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = key_value_store)]
pub struct KeyValueStoreRow {
    pub id: KeyType,
    pub value_string: Option<String>,
    pub value_int: Option<i32>,
    pub value_bigint: Option<i64>,
    pub value_float: Option<f64>,
    pub value_bool: Option<bool>,
}

pub struct KeyValueStoreRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> KeyValueStoreRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        KeyValueStoreRepository { connection }
    }

    pub fn upsert_one(&self, value: &KeyValueStoreRow) -> Result<(), RepositoryError> {
        diesel::insert_into(key_value_store::table)
            .values(value)
            .on_conflict(key_value_store::id)
            .do_update()
            .set(value)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    fn get_row(&self, key: KeyType) -> Result<Option<KeyValueStoreRow>, RepositoryError> {
        let result = key_value_store::table
            .filter(key_value_store::id.eq(key))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn set_string(&self, key: KeyType, value: Option<String>) -> Result<(), RepositoryError> {
        self.upsert_one(&KeyValueStoreRow {
            id: key,
            value_string: value,
            value_int: None,
            value_bigint: None,
            value_float: None,
            value_bool: None,
        })
    }

    pub fn get_string(&self, key: KeyType) -> Result<Option<String>, RepositoryError> {
        let row = self.get_row(key)?;
        Ok(row.and_then(|row| row.value_string))
    }

    pub fn set_i32(&self, key: KeyType, value: Option<i32>) -> Result<(), RepositoryError> {
        self.upsert_one(&KeyValueStoreRow {
            id: key,
            value_string: None,
            value_int: value,
            value_bigint: None,
            value_float: None,
            value_bool: None,
        })
    }

    pub fn get_i32(&self, key: KeyType) -> Result<Option<i32>, RepositoryError> {
        let row = self.get_row(key)?;
        Ok(row.and_then(|row| row.value_int))
    }

    pub fn set_i64(&self, key: KeyType, value: Option<i64>) -> Result<(), RepositoryError> {
        self.upsert_one(&KeyValueStoreRow {
            id: key,
            value_string: None,
            value_int: None,
            value_bigint: value,
            value_float: None,
            value_bool: None,
        })
    }

    pub fn get_i64(&self, key: KeyType) -> Result<Option<i64>, RepositoryError> {
        let row = self.get_row(key)?;
        Ok(row.and_then(|row| row.value_bigint))
    }

    pub fn set_f64(&self, key: KeyType, value: Option<f64>) -> Result<(), RepositoryError> {
        self.upsert_one(&KeyValueStoreRow {
            id: key,
            value_string: None,
            value_int: None,
            value_bigint: None,
            value_float: value,
            value_bool: None,
        })
    }

    pub fn get_f64(&self, key: KeyType) -> Result<Option<f64>, RepositoryError> {
        let row = self.get_row(key)?;
        Ok(row.and_then(|row| row.value_float))
    }

    pub fn set_bool(&self, key: KeyType, value: Option<bool>) -> Result<(), RepositoryError> {
        self.upsert_one(&KeyValueStoreRow {
            id: key,
            value_string: None,
            value_int: None,
            value_bigint: None,
            value_float: None,
            value_bool: value,
        })
    }

    pub fn get_bool(&self, key: KeyType) -> Result<Option<bool>, RepositoryError> {
        let row = self.get_row(key)?;
        Ok(row.and_then(|row| row.value_bool))
    }
}

#[cfg(test)]
mod test {
    use super::*;
    use strum::IntoEnumIterator;
    use util::assert_matches;

    use crate::{mock::MockDataInserts, test_db::setup_all};

    #[actix_rt::test]
    async fn key_type_enum() {
        let (_, connection, _, _) = setup_all("key_type_enum", MockDataInserts::none()).await;

        let repo = KeyValueStoreRepository::new(&connection);
        // Try upsert all variants, confirm that diesel enums match postgres
        for variant in KeyType::iter() {
            let result = repo.upsert_one(&KeyValueStoreRow {
                id: variant.clone(),
                ..Default::default()
            });
            assert_eq!(result, Ok(()));

            assert_matches!(repo.get_row(variant.clone()), Ok(Some(_)));
        }
    }
}
