use super::{location_row::location, LocationRow, StorageConnection};

use crate::{
    asset_internal_location_row::asset_internal_location,
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    StringFilter,
};

use crate::{repository_error::RepositoryError, DBType, EqualFilter, Pagination, Sort};
use diesel::prelude::*;

#[derive(PartialEq, Debug, Clone)]
pub struct Location {
    pub location_row: LocationRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct LocationFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub code: Option<StringFilter>,
    pub on_hold: Option<bool>,
    pub store_id: Option<EqualFilter<String>>,
    pub assigned_to_asset: Option<bool>,
    pub location_type_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum LocationSortField {
    Name,
    Code,
}

pub type LocationSort = Sort<LocationSortField>;

pub struct LocationRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LocationRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LocationRepository { connection }
    }

    pub fn count(&self, filter: Option<LocationFilter>) -> Result<i64, RepositoryError> {
        // TODO (beyond M2), check that store_id matches current store
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: LocationFilter,
    ) -> Result<Vec<Location>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<LocationFilter>,
        sort: Option<LocationSort>,
    ) -> Result<Vec<Location>, RepositoryError> {
        // TODO (beyond M2), check that store_id matches current store
        let mut query = Self::create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                LocationSortField::Name => {
                    apply_sort_no_case!(query, sort, location::name)
                }
                LocationSortField::Code => {
                    apply_sort_no_case!(query, sort, location::code)
                }
            }
        } else {
            query = query.order(location::id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<LocationRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }

    pub fn create_filtered_query(filter: Option<LocationFilter>) -> BoxedLocationQuery {
        let mut query = location::table.into_boxed();

        if let Some(filter) = filter {
            apply_equal_filter!(query, filter.id, location::id);
            apply_string_filter!(query, filter.name, location::name);
            apply_string_filter!(query, filter.code, location::code);

            if let Some(value) = filter.on_hold {
                query = query.filter(location::on_hold.eq(value));
            }
            if let Some(value) = filter.assigned_to_asset {
                let sub_query =
                    asset_internal_location::table.select(asset_internal_location::location_id);

                match value {
                    true => {
                        query = query.filter(location::id.eq_any(sub_query));
                    }
                    false => {
                        query = query.filter(location::id.ne_all(sub_query));
                    }
                }
            }

            apply_equal_filter!(query, filter.store_id, location::store_id);
            apply_equal_filter!(query, filter.location_type_id, location::location_type_id);
        }

        query
    }
}

type BoxedLocationQuery = location::BoxedQuery<'static, DBType>;

fn to_domain(location_row: LocationRow) -> Location {
    Location { location_row }
}

impl LocationFilter {
    pub fn new() -> LocationFilter {
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

    pub fn code(mut self, filter: StringFilter) -> Self {
        self.code = Some(filter);
        self
    }

    pub fn on_hold(mut self, filter: bool) -> Self {
        self.on_hold = Some(filter);
        self
    }

    pub fn assigned_to_asset(mut self, filter: bool) -> Self {
        self.assigned_to_asset = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn location_type_id(mut self, filter: EqualFilter<String>) -> Self {
        self.location_type_id = Some(filter);
        self
    }
}
