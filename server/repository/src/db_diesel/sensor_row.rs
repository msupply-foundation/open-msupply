use super::{location_row::location, store_row::store, StorageConnection};

use crate::{repository_error::RepositoryError, ChangelogSyncType, Upsert};
use crate::{
    ChangeLogInsertRow, ChangelogRepository, ChangelogTableName, KeyValueStoreRepository,
    RowActionType,
};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    sensor (id) {
        id -> Text,
        name -> Text,
        serial -> Text,
        location_id -> Nullable<Text>,
        store_id -> Text,
        battery_level -> Nullable<Integer>,
        log_interval -> Nullable<Integer>,
        is_active -> Bool,
        last_connection_datetime -> Nullable<Timestamp>,
        #[sql_name = "type"] type_ -> crate::db_diesel::sensor_row::SensorTypeMapping,
    }
}

joinable!(sensor -> store (store_id));
joinable!(sensor -> location (location_id));

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SensorType {
    #[default]
    BlueMaestro,
    Laird,
    Berlinger,
    LogTag,
}

// TODO put this somewhere more sensible
// perhaps the cold chain service
pub fn get_sensor_type(serial: &str) -> SensorType {
    match serial.split('|').nth(1) {
        Some("BLUE_MAESTRO") => SensorType::BlueMaestro,
        Some("LAIRD") => SensorType::Laird,
        Some("BERLINGER") => SensorType::Berlinger,
        Some("LOG_TAG") => SensorType::LogTag,
        _ => SensorType::BlueMaestro,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Serialize, Default)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = sensor)]
pub struct SensorRow {
    pub id: String,
    pub name: String,
    pub serial: String,
    pub location_id: Option<String>,
    pub store_id: String,
    pub battery_level: Option<i32>,
    pub log_interval: Option<i32>,
    pub is_active: bool,
    pub last_connection_datetime: Option<NaiveDateTime>,
    #[diesel(column_name = "type_")]
    pub r#type: SensorType,
}

impl SensorRow {
    pub fn changelog(
        &self,
        con: &StorageConnection,
        action: RowActionType,
        source_site_id: Option<i32>,
    ) -> Result<ChangeLogInsertRow, RepositoryError> {
        Ok(ChangeLogInsertRow {
            table_name: ChangelogTableName::Sensor,
            record_id: self.id.clone(),
            row_action: action,
            store_id: Some(self.store_id.clone()),
            name_id: None,
            source_site_id: KeyValueStoreRepository::new(con).get_source_site_id(source_site_id)?,
            ..Default::default()
        })
    }
}

pub struct SensorRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SensorRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SensorRowRepository { connection }
    }

    pub fn _upsert_one(&self, row: &SensorRow) -> Result<(), RepositoryError> {
        diesel::insert_into(sensor::table)
            .values(row)
            .on_conflict(sensor::id)
            .do_update()
            .set(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &SensorRow) -> Result<i64, RepositoryError> {
        self._upsert_one(row)?;
        let changelog = row.changelog(self.connection, RowActionType::Upsert, None)?;
        ChangelogRepository::new(self.connection).insert(&changelog)
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<SensorRow>, RepositoryError> {
        let result = sensor::table
            .filter(sensor::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<SensorRow>, RepositoryError> {
        Ok(sensor::table
            .filter(sensor::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for SensorRow {
    fn upsert_sync(&self, con: &StorageConnection, sync_type: ChangelogSyncType) -> Result<(), RepositoryError> {
        SensorRowRepository::new(con)._upsert_one(self)?;

        let changelog = match sync_type {
            ChangelogSyncType::SyncTypeV5V6 { source_site_id } => {
                self.changelog(con, RowActionType::Upsert, source_site_id)?
            }
            ChangelogSyncType::SyncTypeV7 { changelog_row } => changelog_row,
        };

        ChangelogRepository::new(con).insert(&changelog)?;
        Ok(())
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            SensorRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
