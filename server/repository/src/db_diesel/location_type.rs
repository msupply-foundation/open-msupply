use super::{location_type_row::location_type, DBType, LocationTypeRow, StorageConnection};

use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort, apply_sort_no_case},
    repository_error::RepositoryError,
};

use crate::{EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone, serde::Serialize)]
pub struct LocationType {
    pub location_type_row: LocationTypeRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct LocationTypeFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum LocationTypeSortField {
    Id,
    Name,
    MinTemperature,
}

pub type LocationTypeSort = Sort<LocationTypeSortField>;

pub struct LocationTypeRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LocationTypeRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LocationTypeRepository { connection }
    }

    pub fn count(&self, filter: Option<LocationTypeFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: LocationTypeFilter,
    ) -> Result<Vec<LocationType>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<LocationTypeFilter>,
        sort: Option<LocationTypeSort>,
    ) -> Result<Vec<LocationType>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                LocationTypeSortField::Id => {
                    apply_sort_no_case!(query, sort, location_type::id)
                }
                LocationTypeSortField::Name => {
                    apply_sort!(query, sort, location_type::name)
                }
                LocationTypeSortField::MinTemperature => {
                    apply_sort!(query, sort, location_type::min_temperature)
                }
            }
        } else {
            query = query.order(location_type::name.desc())
        }

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&query).to_string()
        // );

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<LocationTypeRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(filter: Option<LocationTypeFilter>) -> BoxedLocationTypeQuery {
        let mut query = location_type::table.into_boxed();

        if let Some(f) = filter {
            let LocationTypeFilter { id, name } = f;

            apply_equal_filter!(query, id, location_type::id);
            apply_equal_filter!(query, name, location_type::name);
        }

        query
    }
}

type BoxedLocationTypeQuery = location_type::BoxedQuery<'static, DBType>;

fn to_domain(location_type_row: LocationTypeRow) -> LocationType {
    LocationType { location_type_row }
}

impl LocationTypeFilter {
    pub fn new() -> LocationTypeFilter {
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
