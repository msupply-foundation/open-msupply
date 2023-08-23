use super::{
    location_row::location, sensor_row::sensor, temperature_breach_row::temperature_breach::dsl as temperature_breach_dsl, store_row::store,
    StorageConnection,
};

use crate::repository_error::RepositoryError;

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    temperature_breach (id) {
        id -> Text,
        duration -> Integer,
        #[sql_name = "type"] type_ -> crate::db_diesel::temperature_breach_row::TemperatureBreachRowTypeMapping,
        sensor_id -> Text,
        location_id -> Nullable<Text>,
        store_id -> Nullable<Text>,
        start_timestamp -> Timestamp,
        end_timestamp -> Timestamp,
        acknowledged -> Bool,
        threshold_minimum -> Float,
        threshold_maximum -> Float,
        threshold_duration -> Integer,
    }
}

table! {
    #[sql_name = "temperature_breach"]
    temperature_breach_is_sync_update (id) {
        id -> Text,
        is_sync_update -> Bool,
    }
}

joinable!(temperature_breach -> sensor (sensor_id));
joinable!(temperature_breach -> store (store_id));
joinable!(temperature_breach -> location (location_id));

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum TemperatureBreachRowType {
    ColdConsecutive,
    ColdCumulative,
    HotConsecutive,
    HotCumulative,
}

#[derive(Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq)]
#[changeset_options(treat_none_as_null = "true")]
#[table_name = "temperature_breach"]
pub struct TemperatureBreachRow {
    pub id: String,
    pub duration: i32,
    #[column_name = "type_"]
    pub r#type: TemperatureBreachRowType,
    pub sensor_id: String,
    pub location_id: Option<String>,
    pub store_id: Option<String>,
    pub start_timestamp: NaiveDateTime,
    pub end_timestamp: NaiveDateTime,
    pub acknowledged: bool,
    pub threshold_minimum: f32,
    pub threshold_maximum: f32,
    pub threshold_duration: i32,
}

impl Default for TemperatureBreachRow {
    fn default() -> Self {
        TemperatureBreachRow {
            id: Default::default(),
            duration: Default::default(),
            r#type: TemperatureBreachRowType::HotConsecutive,
            sensor_id: Default::default(),
            location_id: None,
            store_id: None,
            start_timestamp: Default::default(),
            end_timestamp: Default::default(),
            acknowledged: false,
            threshold_minimum: Default::default(),
            threshold_maximum: Default::default(),
            threshold_duration: Default::default(),
        }
    }
}
pub struct TemperatureBreachRowRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> TemperatureBreachRowRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureBreachRowRepository { connection }
    }

    #[cfg(feature = "postgres")]
    pub fn _upsert_one(&self, row: &TemperatureBreachRow) -> Result<(), RepositoryError> {
        diesel::insert_into(temperature_breach_dsl::temperature_breach)
            .values(row)
            .on_conflict(temperature_breach_dsl::id)
            .do_update()
            .set(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(&self, row: &TemperatureBreachRow) -> Result<(), RepositoryError> {
        diesel::replace_into(temperature_breach_dsl::temperature_breach)
            .values(row)
            .execute(&self.connection.connection)?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &TemperatureBreachRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        Ok(())
    }

    pub fn find_one_by_id(&self, id: &str) -> Result<Option<TemperatureBreachRow>, RepositoryError> {
        let result = temperature_breach_dsl::temperature_breach
            .filter(temperature_breach_dsl::id.eq(id))
            .first(&self.connection.connection)
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(&self, ids: &[String]) -> Result<Vec<TemperatureBreachRow>, RepositoryError> {
        Ok(temperature_breach_dsl::temperature_breach
            .filter(temperature_breach_dsl::id.eq_any(ids))
            .load(&self.connection.connection)?)
    }
}
