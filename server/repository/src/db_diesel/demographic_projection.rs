use super::{
    demographic_projection_row::{
        demographic_projection, demographic_projection::dsl as demographic_projection_dsl,
    },
    DBType, StorageConnection,
};
use diesel::prelude::*;

use crate::{
    demographic_projection_row::DemographicProjectionRow,
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    repository_error::RepositoryError,
    Pagination,
};

pub type DemographicProjection = DemographicProjectionRow;

use crate::{EqualFilter, Sort};

#[derive(Clone, Default)]
pub struct DemographicProjectionFilter {
    pub id: Option<EqualFilter<String>>,
    pub base_year: Option<EqualFilter<i32>>,
}

pub enum DemographicProjectionSortField {
    Id,
}

pub type DemographicProjectionSort = Sort<DemographicProjectionSortField>;

pub struct DemographicProjectionRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DemographicProjectionRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DemographicProjectionRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<DemographicProjectionFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: DemographicProjectionFilter,
    ) -> Result<Vec<DemographicProjection>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,

        filter: Option<DemographicProjectionFilter>,
        sort: Option<DemographicProjectionSort>,
    ) -> Result<Vec<DemographicProjection>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                DemographicProjectionSortField::Id => {
                    apply_sort_no_case!(query, sort, demographic_projection_dsl::id)
                }
            }
        } else {
            query = query.order(demographic_projection_dsl::id.asc())
        }
        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        let result =
            final_query.load::<DemographicProjectionRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedLogQuery = demographic_projection::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<DemographicProjectionFilter>) -> BoxedLogQuery {
    let mut query = demographic_projection::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, demographic_projection_dsl::id);
    }
    query
}

pub fn to_domain(demographic_projection_row: DemographicProjectionRow) -> DemographicProjection {
    demographic_projection_row
}

impl DemographicProjectionFilter {
    pub fn new() -> DemographicProjectionFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn base_year(mut self, filter: EqualFilter<i32>) -> Self {
        self.base_year = Some(filter);
        self
    }
}
