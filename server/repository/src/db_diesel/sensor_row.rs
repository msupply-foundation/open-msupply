use super::{
    location_row::location, sensor_row::sensor::dsl as sensor_dsl, store_row::store,
    StorageConnection,
};

use crate::{repository_error::RepositoryError, Upsert};

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

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum SensorType {
    BlueMaestro,
    Laird,
    Berlinger,
}

// TODO put this somewhere more sensible
// perhaps the cold chain service
pub fn get_sensor_type(serial: &str) -> SensorType {
    match serial.split('|').nth(1) {
        Some("BLUE_MAESTRO") => SensorType::BlueMaestro,
        Some("LAIRD") => SensorType::Laird,
        Some("BERLINGER") => SensorType::Berlinger,
        _ => SensorType::BlueMaestro,
    }
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Serialize, Deserialize)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "sensor"]
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
    #[column_name = "type_"]
    pub r#type: SensorType,
}

impl Default for SensorRow {
    fn default() -> Self {
        SensorRow {
            id: Default::default(),
            name: Default::default(),
            serial: Default::default(),
            store_id: Default::default(),
            location_id: None,
            battery_level: None,
            log_interval: None,
            is_active: false,
            last_connection_datetime: None,
            r#type: SensorType::BlueMaestro,
        }
    }
}
pub struct SensorRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SensorRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SensorRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn _upsert_one(&self, row: &SensorRow) -> Result<(), RepositoryError> {
        diesel::insert_into(sensor_dsl::sensor)
            .values(row)
            .on_conflict(sensor_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(&self, row: &SensorRow) -> Result<(), RepositoryError> {
        diesel::replace_into(sensor_dsl::sensor)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<SensorRow>, RepositoryError> {
        let result = sensor_dsl::sensor
            .filter(sensor_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<SensorRow>, RepositoryError> {
        Ok(sensor_dsl::sensor
            .filter(sensor_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?)
    }
}

impl SensorRow {
    fn get_store_and_name_link_id(
        &self,
        _: &StorageConnection,
    ) -> Result<(Option<String>, Option<String>), RepositoryError> {
        Ok((Some(self.store_id.clone()), None))
    }
}

crate::create_upsert_trait!(
    SensorRow,
    SensorRowRepository,
    crate::ChangelogTableName::Sensor
);
