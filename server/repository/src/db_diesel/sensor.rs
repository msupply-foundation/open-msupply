use super::{
    sensor_row::{sensor, sensor::dsl as sensor_dsl},
    DBType, SensorRow, StorageConnection,
};
use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    StringFilter,
};

use crate::{EqualFilter, Pagination, Sort};

#[derive(serde::Serialize, PartialEq, Debug, Clone)]
pub struct Sensor {
    pub sensor_row: SensorRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct SensorFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub serial: Option<EqualFilter<String>>,
    pub is_active: Option<bool>,
    pub store_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum SensorSortField {
    Id,
    Serial,
    Name,
}

pub type SensorSort = Sort<SensorSortField>;

pub struct SensorRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SensorRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SensorRepository { connection }
    }

    pub fn count(&self, filter: Option<SensorFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(&self, filter: SensorFilter) -> Result<Vec<Sensor>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<SensorFilter>,
        sort: Option<SensorSort>,
    ) -> Result<Vec<Sensor>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                SensorSortField::Id => {
                    apply_sort_no_case!(query, sort, sensor_dsl::id)
                }
                SensorSortField::Serial => {
                    apply_sort_no_case!(query, sort, sensor_dsl::serial)
                }
                SensorSortField::Name => {
                    apply_sort_no_case!(query, sort, sensor_dsl::name)
                }
            }
        } else {
            query = query.order(sensor_dsl::name.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<SensorRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(filter: Option<SensorFilter>) -> BoxedSensorQuery {
        let mut query = sensor::table.into_boxed();

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, sensor_dsl::id);
            apply_string_filter!(query, filter.name, sensor_dsl::name);
            apply_equal_filter!(query, filter.serial, sensor_dsl::serial);

            if let Some(value) = filter.is_active {
                query = query.filter(sensor_dsl::is_active.eq(value));
            }

            apply_equal_filter!(query, filter.store_id, sensor_dsl::store_id);
        }

        query
    }
}

type BoxedSensorQuery = sensor::BoxedQuery<'static, DBType>;

fn to_domain(sensor_row: SensorRow) -> Sensor {
    Sensor { sensor_row }
}

impl SensorFilter {
    pub fn new() -> SensorFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: StringFilter) -> Self {
        self.name = Some(filter);
        self
    }

    pub fn serial(mut self, filter: EqualFilter<String>) -> Self {
        self.serial = Some(filter);
        self
    }

    pub fn is_active(mut self, filter: bool) -> Self {
        self.is_active = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }
}
