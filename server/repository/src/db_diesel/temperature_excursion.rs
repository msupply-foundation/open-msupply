use crate::{
    db_diesel::{
        temperature_breach_config_row::temperature_breach_config::dsl as temperature_breach_config_dsl,
        temperature_log_row::temperature_log::dsl as temperature_log_dsl,
    },
    diesel_macros::{apply_date_time_filter, apply_equal_filter},
    TemperatureBreachRowType, TemperatureLogFilter,
};
use crate::{RepositoryError, StorageConnection};
use chrono::NaiveDateTime;

use diesel::{prelude::*, sql_types::Integer};

#[derive(Debug, PartialEq, Clone)]
pub struct TemperatureExcursion {
    pub id: String,
    pub datetime: NaiveDateTime,
    pub temperature: f64,
    pub location_id: Option<String>,
    pub sensor_id: String,
    pub duration: i64,
    pub store_id: String,
}

/// An abstraction over the temperature log table
/// Excursions are a representation of temperature log
/// entries which are outside of a configurable range
pub struct TemperatureExcursionRepository<'a> {
    connection: &'a StorageConnection,
}

type QueryResult = (
    String,
    NaiveDateTime,
    f64,
    String,
    String,
    Option<String>,
    i32,
    bool,
);

#[derive(Debug, PartialEq, Clone)]
pub struct TemperatureRow {
    pub id: String,
    pub datetime: NaiveDateTime,
    pub temperature: f64,
    pub store_id: String,
    pub sensor_id: String,
    pub location_id: Option<String>,
    pub is_excursion: bool,
    pub duration: i64,
}

impl<'a> TemperatureExcursionRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureExcursionRepository { connection }
    }

    /// Result is sorted by datetime descending
    pub fn query(
        &self,
        filter: TemperatureLogFilter,
    ) -> Result<Vec<TemperatureRow>, RepositoryError> {
        let mut query = temperature_log_dsl::temperature_log
            .inner_join(
                temperature_breach_config_dsl::temperature_breach_config
                    .on(temperature_log_dsl::store_id.eq(temperature_breach_config_dsl::store_id)),
            )
            .select((
                temperature_log_dsl::id,
                temperature_log_dsl::datetime,
                temperature_log_dsl::temperature,
                temperature_log_dsl::store_id,
                temperature_log_dsl::sensor_id,
                temperature_log_dsl::location_id,
                (temperature_breach_config_dsl::duration_milliseconds / 1000).into_sql::<Integer>(),
                temperature_log_dsl::temperature.not_between(
                    temperature_breach_config_dsl::minimum_temperature,
                    temperature_breach_config_dsl::maximum_temperature,
                ),
            ))
            .filter(temperature_log_dsl::temperature_breach_id.is_null())
            .order(temperature_log_dsl::datetime.asc())
            .into_boxed();

        apply_equal_filter!(query, filter.store_id, temperature_log_dsl::store_id);
        apply_date_time_filter!(query, filter.datetime, temperature_log_dsl::datetime);

        query = query.filter(temperature_breach_config_dsl::is_active.eq(true));

        apply_equal_filter!(
            query,
            Some(TemperatureBreachRowType::Excursion.equal_to()),
            temperature_breach_config_dsl::type_
        );

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let log_data = query
            .load::<QueryResult>(&self.connection.connection)?
            .into_iter()
            .map(TemperatureRow::from)
            .collect::<Vec<TemperatureRow>>();

        Ok(log_data)
    }
}

impl TemperatureRow {
    fn from(
        (id, datetime, temperature, store_id, sensor_id, location_id, duration, is_excursion): QueryResult,
    ) -> Self {
        Self {
            id,
            datetime,
            temperature,
            sensor_id,
            location_id,
            duration: duration as i64,
            store_id,
            is_excursion,
        }
    }
}
