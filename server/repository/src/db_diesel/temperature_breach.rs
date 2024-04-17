use super::{
    location_row::location::dsl as location_dsl,
    sensor_row::sensor::dsl as sensor_dsl,
    temperature_breach_row::{
        temperature_breach, temperature_breach::dsl as temperature_breach_dsl,
    },
    DBType, StorageConnection, TemperatureBreachRow, TemperatureBreachRowType,
};
use diesel::prelude::*;
use util::inline_init;

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort, apply_sort_no_case},
    location::{LocationFilter, LocationRepository},
    repository_error::RepositoryError,
    SensorFilter, SensorRepository,
};

use crate::{DatetimeFilter, EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone, serde::Serialize)]
pub struct TemperatureBreach {
    pub temperature_breach_row: TemperatureBreachRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct TemperatureBreachFilter {
    pub id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<TemperatureBreachRowType>>,
    pub store_id: Option<EqualFilter<String>>,
    pub start_datetime: Option<DatetimeFilter>,
    pub end_datetime: Option<DatetimeFilter>,
    pub unacknowledged: Option<bool>,
    pub sensor: Option<SensorFilter>,
    pub location: Option<LocationFilter>,
}

impl EqualFilter<TemperatureBreachRowType> {
    pub fn equal_to_breach_type(value: &TemperatureBreachRowType) -> Self {
        inline_init(|r: &mut Self| r.equal_to = Some(value.to_owned()))
    }
}

#[derive(PartialEq, Debug)]
pub enum TemperatureBreachSortField {
    Id,
    StartDatetime,
    EndDatetime,
}

pub type TemperatureBreachSort = Sort<TemperatureBreachSortField>;

pub struct TemperatureBreachRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> TemperatureBreachRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureBreachRepository { connection }
    }

    pub fn count(&self, filter: Option<TemperatureBreachFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: TemperatureBreachFilter,
    ) -> Result<Vec<TemperatureBreach>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<TemperatureBreachFilter>,
        sort: Option<TemperatureBreachSort>,
    ) -> Result<Vec<TemperatureBreach>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                TemperatureBreachSortField::Id => {
                    apply_sort_no_case!(query, sort, temperature_breach_dsl::id)
                }
                TemperatureBreachSortField::StartDatetime => {
                    apply_sort!(query, sort, temperature_breach_dsl::start_datetime)
                }
                TemperatureBreachSortField::EndDatetime => {
                    apply_sort!(query, sort, temperature_breach_dsl::end_datetime)
                }
            }
        } else {
            query = query.order(temperature_breach_dsl::start_datetime.desc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<TemperatureBreachRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(
        filter: Option<TemperatureBreachFilter>,
    ) -> BoxedTemperatureBreachQuery {
        let mut query = temperature_breach_dsl::temperature_breach.into_boxed();

        if let Some(f) = filter {
            let TemperatureBreachFilter {
                id,
                store_id,
                unacknowledged,
                start_datetime,
                end_datetime,
                r#type,
                sensor,
                location,
            } = f;

            apply_equal_filter!(query, id, temperature_breach_dsl::id);
            apply_equal_filter!(query, store_id, temperature_breach_dsl::store_id);
            apply_equal_filter!(query, r#type, temperature_breach_dsl::type_);
            apply_date_time_filter!(
                query,
                start_datetime,
                temperature_breach_dsl::start_datetime
            );
            apply_date_time_filter!(query, end_datetime, temperature_breach_dsl::end_datetime);

            if let Some(value) = unacknowledged {
                query = query.filter(temperature_breach_dsl::unacknowledged.eq(value));
            }

            if sensor.is_some() {
                let sensor_ids =
                    SensorRepository::create_filtered_query(sensor).select(sensor_dsl::id);
                query = query.filter(temperature_breach_dsl::sensor_id.eq_any(sensor_ids));
            }

            if location.is_some() {
                let location_ids = LocationRepository::create_filtered_query(location)
                    .select(location_dsl::id.nullable());
                query = query.filter(temperature_breach_dsl::location_id.eq_any(location_ids));
            }
        }

        query
    }
}

type BoxedTemperatureBreachQuery = temperature_breach::BoxedQuery<'static, DBType>;

impl TemperatureBreachRowType {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }

    pub fn not_equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.not_equal_to = Some(self.clone()))
    }

    pub fn equal_any(value: Vec<Self>) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_any = Some(value))
    }
}

fn to_domain(temperature_breach_row: TemperatureBreachRow) -> TemperatureBreach {
    TemperatureBreach {
        temperature_breach_row,
    }
}

impl TemperatureBreachFilter {
    pub fn new() -> TemperatureBreachFilter {
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

    pub fn unacknowledged(mut self, filter: bool) -> Self {
        self.unacknowledged = Some(filter);
        self
    }

    pub fn start_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.start_datetime = Some(filter);
        self
    }

    pub fn end_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.end_datetime = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<TemperatureBreachRowType>) -> Self {
        self.r#type = Some(filter);
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
}
