use super::{
    temperature_log_row::{temperature_log, temperature_log::dsl as temperature_log_dsl},
    DBType, TemperatureLogRow, StorageConnection,
};
use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort, apply_sort_no_case},
    repository_error::RepositoryError,
};

use crate::{DatetimeFilter, EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone)]
pub struct TemperatureLog {
    pub temperature_log_row: TemperatureLogRow,
}

#[derive(Clone, PartialEq, Debug)]
pub struct TemperatureLogFilter {
    pub id: Option<EqualFilter<String>>,
    pub sensor_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub timestamp: Option<DatetimeFilter>,
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
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(&self, filter: TemperatureLogFilter) -> Result<Vec<TemperatureLog>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<TemperatureLogFilter>,
        sort: Option<TemperatureLogSort>,
    ) -> Result<Vec<TemperatureLog>, RepositoryError> {
        let mut query = create_filtered_query(filter);
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
            .load::<TemperatureLogRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedLogQuery = temperature_log::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<TemperatureLogFilter>) -> BoxedLogQuery {
    let mut query = temperature_log::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, temperature_log_dsl::id);
        apply_equal_filter!(query, filter.sensor_id, temperature_log_dsl::sensor_id);
        apply_equal_filter!(query, filter.store_id, temperature_log_dsl::store_id);
        apply_date_time_filter!(query, filter.timestamp, temperature_log_dsl::timestamp);
    }

    query
}

pub fn to_domain(temperature_log_row: TemperatureLogRow) -> TemperatureLog {
    TemperatureLog { temperature_log_row }
}

impl TemperatureLogFilter {
    pub fn new() -> TemperatureLogFilter {
        TemperatureLogFilter {
            id: None,
            sensor_id: None,
            store_id: None,
            timestamp: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    
    pub fn sensor_id(mut self, filter: EqualFilter<String>) -> Self {
        self.sensor_id = Some(filter);
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
}
