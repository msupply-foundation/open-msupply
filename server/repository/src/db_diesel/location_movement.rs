use diesel::*;

use super::{
    location_movement_row::location_movement::{self, dsl as location_movement_dsl},
    LocationMovementRow, StorageConnection,
};
use crate::{
    diesel_macros::{
        apply_date_time_filter, apply_equal_filter, apply_sort, apply_sort_asc_nulls_first,
    },
    DBType, DatetimeFilter, EqualFilter, Pagination, RepositoryError, Sort,
};

#[derive(PartialEq, Debug, Clone, Default)]
pub struct LocationMovement {
    pub location_movement_row: LocationMovementRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct LocationMovementFilter {
    pub id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub location_id: Option<EqualFilter<String>>,
    pub stock_line_id: Option<EqualFilter<String>>,
    pub enter_datetime: Option<DatetimeFilter>,
    pub exit_datetime: Option<DatetimeFilter>,
}

#[derive(PartialEq, Debug)]
pub enum LocationMovementSortField {
    EnterDatetime,
    ExitDatetime,
}

pub type LocationMovementSort = Sort<LocationMovementSortField>;

pub struct LocationMovementRepository<'a> {
    connection: &'a mut StorageConnection,
}

impl<'a> LocationMovementRepository<'a> {
    pub fn new(connection: &'a mut StorageConnection) -> Self {
        LocationMovementRepository { connection }
    }

    pub fn count(
        &mut self,
        filter: Option<LocationMovementFilter>,
    ) -> Result<i64, RepositoryError> {
        // TODO (beyond M2), check that store_id matches current store
        let query = create_filtered_query(filter);

        Ok(query.count().get_result(&mut self.connection.connection)?)
    }

    pub fn query_by_filter(
        &mut self,
        filter: LocationMovementFilter,
    ) -> Result<Vec<LocationMovement>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &mut self,
        pagination: Pagination,
        filter: Option<LocationMovementFilter>,
        sort: Option<LocationMovementSort>,
    ) -> Result<Vec<LocationMovement>, RepositoryError> {
        // TODO (beyond M2), check that store_id matches current store
        let mut query = create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                LocationMovementSortField::EnterDatetime => {
                    apply_sort!(query, sort, location_movement_dsl::enter_datetime)
                }
                LocationMovementSortField::ExitDatetime => {
                    apply_sort_asc_nulls_first!(query, sort, location_movement_dsl::exit_datetime)
                }
            }
        } else {
            query = query.order(location_movement_dsl::enter_datetime.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<LocationMovementRow>(&mut self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedLocationMovementQuery = location_movement::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<LocationMovementFilter>) -> BoxedLocationMovementQuery {
    let mut query = location_movement::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, location_movement_dsl::id);
        apply_equal_filter!(query, filter.store_id, location_movement_dsl::store_id);
        apply_equal_filter!(
            query,
            filter.stock_line_id,
            location_movement_dsl::stock_line_id
        );
        apply_equal_filter!(
            query,
            filter.location_id,
            location_movement_dsl::location_id
        );
        apply_date_time_filter!(
            query,
            filter.enter_datetime,
            location_movement_dsl::enter_datetime
        );
        apply_date_time_filter!(
            query,
            filter.exit_datetime,
            location_movement_dsl::exit_datetime
        );
    }

    query
}

fn to_domain(location_movement_row: LocationMovementRow) -> LocationMovement {
    LocationMovement {
        location_movement_row,
    }
}

impl LocationMovementFilter {
    pub fn new() -> LocationMovementFilter {
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

    pub fn location_id(mut self, filter: EqualFilter<String>) -> Self {
        self.location_id = Some(filter);
        self
    }

    pub fn stock_line_id(mut self, filter: EqualFilter<String>) -> Self {
        self.stock_line_id = Some(filter);
        self
    }

    pub fn enter_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.enter_datetime = Some(filter);
        self
    }

    pub fn exit_datetime(mut self, filter: DatetimeFilter) -> Self {
        self.exit_datetime = Some(filter);
        self
    }
}
