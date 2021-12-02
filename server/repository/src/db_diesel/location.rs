use super::StorageConnection;

use crate::diesel_extensions::OrderByExtensions;
use crate::repository_error::RepositoryError;
use crate::schema::diesel_schema::{location, location::dsl as location_dsl};
use crate::schema::LocationRow;
use crate::DBType;

use diesel::prelude::*;
use domain::location::{Location, LocationFilter, LocationSort, LocationSortField};
use domain::Pagination;

/// Example expand, when called with:
///
/// ```
/// apply_equal_filter!(query, filter.id, location_dsl::id)
/// ```
///
/// ```
/// if let Some(equal_filter) = filter.id {
///     if let Some(value) = equal_filter.equal_to {
///         query = query.filterd(location_dsl::id.eq(value));
///     }
///
///     if let Some(value) = equal_filter.equal_any {
///         query = query.filter(location_dsl::id.eq_any(value));
///     }
/// }
/// ```
macro_rules! apply_equal_filter {
    ($query:ident, $filter_field:expr, $dsl_field:expr ) => {{
        if let Some(equal_filter) = $filter_field {
            if let Some(value) = equal_filter.equal_to {
                $query = $query.filter($dsl_field.eq(value));
            }

            if let Some(value) = equal_filter.equal_any {
                $query = $query.filter($dsl_field.eq_any(value));
            }
        }
    }};
}

/// Example expand, when called with:
///
/// ```
/// apply_sort_no_case!(query, sort, location_dsl, name)
/// ```
///
/// ```
/// if sort.desc.unwrap_or(false) {
///     query = query.order(location_dsl::name.desc_no_case());
/// } else {
///     query = query.order(location_dsl::name.asc_no_case());
/// }
/// ```
macro_rules! apply_sort_no_case {
    ($query:ident, $sort:ident, $dsl_field:expr) => {{
        if $sort.desc.unwrap_or(false) {
            $query = $query.order($dsl_field.desc_no_case());
        } else {
            $query = $query.order($dsl_field.asc_no_case());
        }
    }};
}

pub struct LocationRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LocationRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LocationRepository { connection }
    }

    pub fn count(&self, filter: Option<LocationFilter>) -> Result<i64, RepositoryError> {
        // TODO (beyond M2), check that store_id matches current store
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&self.connection.connection)?)
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
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                LocationSortField::Name => {
                    apply_sort_no_case!(query, sort, location_dsl::name)
                }
                LocationSortField::Code => {
                    apply_sort_no_case!(query, sort, location_dsl::code)
                }
            }
        } else {
            query = query.order(location_dsl::id.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<LocationRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedLocationQuery = location::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<LocationFilter>) -> BoxedLocationQuery {
    let mut query = location::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, location_dsl::id);
        apply_equal_filter!(query, filter.name, location_dsl::name);
        apply_equal_filter!(query, filter.code, location_dsl::code);
        apply_equal_filter!(query, filter.store_id, location_dsl::store_id);
    }

    query
}

fn to_domain(
    LocationRow {
        id,
        name,
        code,
        on_hold,
        store_id: _,
    }: LocationRow,
) -> Location {
    Location {
        id,
        name,
        code,
        on_hold,
    }
}
