use super::{
    location_row::{location, location::dsl as location_dsl},
    sensor_row::{sensor, sensor::dsl as sensor_dsl},
    temperature_breach_row::{
        temperature_breach, temperature_breach::dsl as temperature_breach_dsl,
    },
    temperature_log_row::{temperature_log, temperature_log::dsl as temperature_log_dsl},
    DBType, StorageConnection, TemperatureBreachRow, TemperatureLogRow,
};
use diesel::{
    helper_types::{InnerJoin, IntoBoxed, LeftJoin},
    prelude::*,
};

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort, apply_sort_no_case},
    location::{LocationFilter, LocationRepository},
    repository_error::RepositoryError,
    LocationRow, SensorFilter, SensorRepository, SensorRow, TemperatureBreachFilter,
    TemperatureBreachRepository,
};

use crate::{DatetimeFilter, EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone)]
pub struct TemperatureLog {
    pub temperature_log_row: TemperatureLogRow,
    pub sensor_row: SensorRow,
    pub location_row: Option<LocationRow>,
    pub temperature_breach_row: Option<TemperatureBreachRow>,
}

pub type TemperatureLogJoin = (
    TemperatureLogRow,
    SensorRow,
    Option<LocationRow>,
    Option<TemperatureBreachRow>,
);

#[derive(Clone, PartialEq, Debug)]
pub struct TemperatureLogFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub timestamp: Option<DatetimeFilter>,
    pub sensor: Option<SensorFilter>,
    pub location: Option<LocationFilter>,
    pub temperature_breach: Option<TemperatureBreachFilter>,
}

#[derive(PartialEq, Debug)]
pub enum TemperatureLogSortField {
    Id,
    Timestamp,
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
        let query = create_filtered_query(filter)?;
        Ok(query.count().get_result(&self.connection.connection)?)
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
        let mut query = create_filtered_query(filter)?;
        if let Some(sort) = sort {
            match sort.key {
                TemperatureLogSortField::Id => {
                    apply_sort_no_case!(query, sort, temperature_log_dsl::id)
                }
                TemperatureLogSortField::Timestamp => {
                    apply_sort!(query, sort, temperature_log_dsl::timestamp)
                }
                TemperatureLogSortField::Temperature => {
                    apply_sort!(query, sort, temperature_log_dsl::temperature)
                }
            }
        } else {
            query = query.order(temperature_log_dsl::timestamp.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<TemperatureLogJoin>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedTemperatureLogQuery = IntoBoxed<
    'static,
    LeftJoin<
        LeftJoin<InnerJoin<temperature_log::table, sensor::table>, location::table>,
        temperature_breach::table,
    >,
    DBType,
>;

fn create_filtered_query(
    filter: Option<TemperatureLogFilter>,
) -> Result<BoxedTemperatureLogQuery, RepositoryError> {
    let mut query = temperature_log_dsl::temperature_log
        .inner_join(sensor_dsl::sensor)
        .left_join(location_dsl::location)
        .left_join(temperature_breach_dsl::temperature_breach)
        .into_boxed();

    if let Some(f) = filter {
        let TemperatureLogFilter {
            id,
            store_id,
            timestamp,
            sensor,
            location,
            temperature_breach,
        } = f;

        apply_equal_filter!(query, id, temperature_log_dsl::id);
        apply_equal_filter!(query, store_id, temperature_log_dsl::store_id);
        apply_date_time_filter!(query, timestamp, temperature_log_dsl::timestamp);

        if sensor.is_some() {
            let sensor_ids = SensorRepository::create_filtered_query(sensor).select(sensor_dsl::id);
            query = query.filter(temperature_log_dsl::sensor_id.eq_any(sensor_ids));
        }

        if location.is_some() {
            let location_ids = LocationRepository::create_filtered_query(location)
                .select(location_dsl::id.nullable());
            query = query.filter(temperature_log_dsl::location_id.eq_any(location_ids));
        }

        if temperature_breach.is_some() {
            let temperature_breach_ids =
                TemperatureBreachRepository::create_filtered_query(temperature_breach)?
                    .select(temperature_breach_dsl::id.nullable());
            query = query
                .filter(temperature_log_dsl::temperature_breach_id.eq_any(temperature_breach_ids));
        }
    }
    Ok(query)
}

pub fn to_domain(
    (temperature_log_row, sensor_row, location_row, temperature_breach_row): TemperatureLogJoin,
) -> TemperatureLog {
    TemperatureLog {
        temperature_log_row,
        sensor_row,
        location_row,
        temperature_breach_row,
    }
}

impl TemperatureLogFilter {
    pub fn new() -> TemperatureLogFilter {
        TemperatureLogFilter {
            id: None,
            store_id: None,
            timestamp: None,
            sensor: None,
            location: None,
            temperature_breach: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn timestamp(mut self, filter: DatetimeFilter) -> Self {
        self.timestamp = Some(filter);
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
}
