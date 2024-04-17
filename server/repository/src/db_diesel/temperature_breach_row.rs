use super::{
    location_row::location, sensor_row::sensor, store_row::store,
    temperature_breach_row::temperature_breach::dsl as temperature_breach_dsl, StorageConnection,
};

use crate::{repository_error::RepositoryError, Upsert};

use chrono::NaiveDateTime;
use diesel::prelude::*;
use diesel_derive_enum::DbEnum;
use serde::{Deserialize, Serialize};

table! {
    temperature_breach (id) {
        id -> Text,
        duration_milliseconds -> Integer,
        #[sql_name = "type"] type_ -> crate::db_diesel::temperature_breach_row::TemperatureBreachRowTypeMapping,
        sensor_id -> Text,
        location_id -> Nullable<Text>,
        store_id -> Text,
        start_datetime -> Timestamp,
        end_datetime -> Nullable<Timestamp>,
        unacknowledged -> Bool,
        threshold_minimum -> Double,
        threshold_maximum -> Double,
        threshold_duration_milliseconds -> Integer,
        comment -> Nullable<Text>,
    }
}

joinable!(temperature_breach -> sensor (sensor_id));
joinable!(temperature_breach -> store (store_id));
joinable!(temperature_breach -> location (location_id));

#[derive(DbEnum, Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
#[DbValueStyle = "SCREAMING_SNAKE_CASE"]
pub enum TemperatureBreachRowType {
    ColdConsecutive,
    ColdCumulative,
    #[default]
    HotConsecutive,
    HotCumulative,
    Excursion,
}

#[derive(
    Clone, Queryable, Insertable, AsChangeset, Debug, PartialEq, Default, serde::Serialize,
)]
#[diesel(treat_none_as_null = true)]
#[diesel(table_name = temperature_breach)]
pub struct TemperatureBreachRow {
    pub id: String,
    pub duration_milliseconds: i32,
    #[diesel(column_name = "type_")]
    pub r#type: TemperatureBreachRowType,
    pub sensor_id: String,
    pub location_id: Option<String>,
    pub store_id: String,
    pub start_datetime: NaiveDateTime,
    pub end_datetime: Option<NaiveDateTime>,
    pub unacknowledged: bool,
    pub threshold_minimum: f64,
    pub threshold_maximum: f64,
    pub threshold_duration_milliseconds: i32,
    pub comment: Option<String>,
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
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    #[cfg(not(feature = "postgres"))]
    pub fn _upsert_one(&self, row: &TemperatureBreachRow) -> Result<(), RepositoryError> {
        diesel::replace_into(temperature_breach_dsl::temperature_breach)
            .values(row)
            .execute(self.connection.lock().connection())?;
        Ok(())
    }

    pub fn upsert_one(&self, row: &TemperatureBreachRow) -> Result<(), RepositoryError> {
        self._upsert_one(row)?;
        Ok(())
    }

    pub fn find_one_by_id(
        &self,
        id: &str,
    ) -> Result<Option<TemperatureBreachRow>, RepositoryError> {
        let result = temperature_breach_dsl::temperature_breach
            .filter(temperature_breach_dsl::id.eq(id))
            .first(self.connection.lock().connection())
            .optional()?;
        Ok(result)
    }

    pub fn find_many_by_id(
        &self,
        ids: &[String],
    ) -> Result<Vec<TemperatureBreachRow>, RepositoryError> {
        Ok(temperature_breach_dsl::temperature_breach
            .filter(temperature_breach_dsl::id.eq_any(ids))
            .load(self.connection.lock().connection())?)
    }
}

impl Upsert for TemperatureBreachRow {
    fn upsert_sync(&self, con: &StorageConnection) -> Result<(), RepositoryError> {
        TemperatureBreachRowRepository::new(con).upsert_one(self)
    }

    // Test only
    fn assert_upserted(&self, con: &StorageConnection) {
        assert_eq!(
            TemperatureBreachRowRepository::new(con).find_one_by_id(&self.id),
            Ok(Some(self.clone()))
        )
    }
}
