use super::{
    temperature_range_row::{temperature_range, temperature_range::dsl as temperature_range_dsl},
    DBType, StorageConnection, TemperatureRangeRow,
};

use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort, apply_sort_no_case},
    // location::{LocationFilter, LocationRepository},
    repository_error::RepositoryError,
};

use crate::{EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone, serde::Serialize)]
pub struct TemperatureRange {
    pub temperature_range_row: TemperatureRangeRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct TemperatureRangeFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum TemperatureRangeSortField {
    Id,
    Name,
}

pub type TemperatureRangeSort = Sort<TemperatureRangeSortField>;

pub struct TemperatureRangeRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> TemperatureRangeRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        TemperatureRangeRepository { connection }
    }

    // pub fn count(&self, filter: Option<TemperatureBreachFilter>) -> Result<i64, RepositoryError> {
    //     let query = Self::create_filtered_query(filter);
    //     Ok(query
    //         .count()
    //         .get_result(self.connection.lock().connection())?)
    // }

    // pub fn query_by_filter(
    //     &self,
    //     filter: TemperatureBreachFilter,
    // ) -> Result<Vec<TemperatureBreach>, RepositoryError> {
    //     self.query(Pagination::all(), Some(filter), None)
    // }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<TemperatureRangeFilter>,
        sort: Option<TemperatureRangeSort>,
    ) -> Result<Vec<TemperatureRange>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                TemperatureRangeSortField::Id => {
                    apply_sort_no_case!(query, sort, temperature_range_dsl::id)
                }
                TemperatureRangeSortField::Name => {
                    apply_sort!(query, sort, temperature_range_dsl::name)
                }
            }
        } else {
            query = query.order(temperature_range_dsl::name.desc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<TemperatureRangeRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(
        filter: Option<TemperatureRangeFilter>,
    ) -> BoxedTemperatureRangeQuery {
        let mut query = temperature_range_dsl::temperature_range.into_boxed();

        if let Some(f) = filter {
            let TemperatureRangeFilter { id, name } = f;

            apply_equal_filter!(query, id, temperature_range_dsl::id);
            apply_equal_filter!(query, name, temperature_range_dsl::name);
        }

        query
    }
}

type BoxedTemperatureRangeQuery = temperature_range::BoxedQuery<'static, DBType>;

fn to_domain(temperature_range_row: TemperatureRangeRow) -> TemperatureRange {
    TemperatureRange {
        temperature_range_row,
    }
}

impl TemperatureRangeFilter {
    pub fn new() -> TemperatureRangeFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn name(mut self, filter: EqualFilter<String>) -> Self {
        self.name = Some(filter);
        self
    }
}

// impl TemperatureRangeType {
//     pub fn equal_to(&self) -> EqualFilter<Self> {
//         EqualFilter {
//             equal_to: Some(self.clone()),
//             ..Default::default()
//         }
//     }
// }
