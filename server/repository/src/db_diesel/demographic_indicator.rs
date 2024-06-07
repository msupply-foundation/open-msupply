use super::{
    demographic_indicator_row::{
        demographic_indicator, demographic_indicator::dsl as demographic_indicator_dsl,
    },
    DBType, StorageConnection,
};
use diesel::prelude::*;

use crate::{
    demographic_indicator_row::DemographicIndicatorRow,
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    Pagination, StringFilter,
};

pub type DemographicIndicator = DemographicIndicatorRow;

use crate::{EqualFilter, Sort};

#[derive(Clone, Default)]
pub struct DemographicIndicatorFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
    pub base_year: Option<EqualFilter<i32>>,
}

pub enum DemographicIndicatorSortField {
    Id,
    Name,
}

pub type DemographicIndicatorSort = Sort<DemographicIndicatorSortField>;

pub struct DemographicIndicatorRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DemographicIndicatorRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DemographicIndicatorRepository { connection }
    }

    pub fn count(
        &self,
        filter: Option<DemographicIndicatorFilter>,
    ) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: DemographicIndicatorFilter,
    ) -> Result<Vec<DemographicIndicator>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<DemographicIndicatorFilter>,
        sort: Option<DemographicIndicatorSort>,
    ) -> Result<Vec<DemographicIndicator>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                DemographicIndicatorSortField::Id => {
                    apply_sort_no_case!(query, sort, demographic_indicator_dsl::id)
                }
                DemographicIndicatorSortField::Name => {
                    apply_sort_no_case!(query, sort, demographic_indicator_dsl::name)
                }
            }
        } else {
            query = query.order(demographic_indicator_dsl::name.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        let result =
            final_query.load::<DemographicIndicatorRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedLogQuery = demographic_indicator::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<DemographicIndicatorFilter>) -> BoxedLogQuery {
    let mut query = demographic_indicator::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, demographic_indicator_dsl::id);
        apply_string_filter!(query, filter.name, demographic_indicator_dsl::name);
        apply_equal_filter!(
            query,
            filter.base_year,
            demographic_indicator_dsl::base_year
        );
    }
    query
}

fn to_domain(demographic_indicator_row: DemographicIndicatorRow) -> DemographicIndicator {
    demographic_indicator_row
}

impl DemographicIndicatorFilter {
    pub fn new() -> DemographicIndicatorFilter {
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
    pub fn base_year(mut self, filter: EqualFilter<i32>) -> Self {
        self.base_year = Some(filter);
        self
    }
}
