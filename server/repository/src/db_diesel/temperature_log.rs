use super::{
    location_row::location, sensor_row::sensor, temperature_breach_row::temperature_breach,
    temperature_log_row::temperature_log, DBType, StorageConnection, TemperatureBreachRow,
    TemperatureLogRow,
};
use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_number_filter, apply_sort},
    location::{LocationFilter, LocationRepository},
    repository_error::RepositoryError,
    LocationRow, NumberFilter, SensorFilter, SensorRepository, SensorRow, TemperatureBreachFilter,
    TemperatureBreachRepository,
};

use crate::{DatetimeFilter, EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone, serde::Serialize)]
pub struct TemperatureLog {
    pub temperature_log_row: TemperatureLogRow,
}

pub type TemperatureLogJoin = (
    TemperatureLogRow,
    SensorRow,
    Option<LocationRow>,
    Option<TemperatureBreachRow>,
);

#[derive(Clone, PartialEq, Debug, Default)]
pub struct TemperatureLogFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub datetime: Option<DatetimeFilter>,
    pub sensor: Option<SensorFilter>,
    pub location: Option<LocationFilter>,
    pub temperature: Option<NumberFilter<f64>>,
    pub temperature_breach_id: Option<EqualFilter<String>>,
    pub temperature_breach: Option<TemperatureBreachFilter>,
}

#[derive(PartialEq, Debug)]
pub enum TemperatureLogSortField {
    Datetime,
    Temperature,
}

pub type TemperatureLogSort = Sort<TemperatureLogSortField>;

pub struct TemperatureLogRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> TemperatureLogRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureLogRepository { connection }
    }

    pub fn count(&self, filter: Option<TemperatureLogFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: TemperatureLogFilter,
    ) -> Result<Vec<TemperatureLog>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<TemperatureLogFilter>,
        sort: Option<TemperatureLogSort>,
    ) -> Result<Vec<TemperatureLog>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                TemperatureLogSortField::Datetime => {
                    apply_sort!(query, sort, temperature_log::datetime)
                }
                TemperatureLogSortField::Temperature => {
                    apply_sort!(query, sort, temperature_log::temperature)
                }
            }
        } else {
            query = query.order(temperature_log::datetime.desc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<TemperatureLogRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(filter: Option<TemperatureLogFilter>) -> BoxedTemperatureLogQuery {
        let mut query = temperature_log::table.into_boxed();

        if let Some(f) = filter {
            let TemperatureLogFilter {
                id,
                store_id,
                datetime,
                sensor,
                location,
                temperature_breach,
                temperature,
                temperature_breach_id,
            } = f;

            apply_equal_filter!(query, id, temperature_log::id);
            apply_equal_filter!(query, store_id, temperature_log::store_id);
            apply_equal_filter!(
                query,
                temperature_breach_id,
                temperature_log::temperature_breach_id
            );
            apply_date_time_filter!(query, datetime, temperature_log::datetime);
            apply_number_filter!(query, temperature, temperature_log::temperature);

            if sensor.is_some() {
                let sensor_ids = SensorRepository::create_filtered_query(sensor).select(sensor::id);
                query = query.filter(temperature_log::sensor_id.eq_any(sensor_ids));
            }

            if location.is_some() {
                let location_ids = LocationRepository::create_filtered_query(location)
                    .select(location::id.nullable());
                query = query.filter(temperature_log::location_id.eq_any(location_ids));
            }
            if temperature_breach.is_some() {
                let temperature_breach_ids =
                    TemperatureBreachRepository::create_filtered_query(temperature_breach)
                        .select(temperature_breach::id.nullable());
                query = query
                    .filter(temperature_log::temperature_breach_id.eq_any(temperature_breach_ids));
            }
        }
        query
    }
}

type BoxedTemperatureLogQuery = temperature_log::BoxedQuery<'static, DBType>;

fn to_domain(temperature_log_row: TemperatureLogRow) -> TemperatureLog {
    TemperatureLog {
        temperature_log_row,
    }
}

impl TemperatureLogFilter {
    pub fn new() -> TemperatureLogFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn temperature_breach_id(mut self, filter: EqualFilter<String>) -> Self {
        self.temperature_breach_id = Some(filter);
        self
    }

    pub fn datetime(mut self, filter: DatetimeFilter) -> Self {
        self.datetime = Some(filter);
        self
    }

    pub fn sensor(mut self, filter: SensorFilter) -> Self {
        self.sensor = Some(filter);
        self
    }

    pub fn location(mut self, filter: LocationFilter) -> Self {
        self.location = Some(filter);
        self
    }

    pub fn temperature_breach(mut self, filter: TemperatureBreachFilter) -> Self {
        self.temperature_breach = Some(filter);
        self
    }

    pub fn temperature(mut self, filter: NumberFilter<f64>) -> Self {
        self.temperature = Some(filter);
        self
    }
}
