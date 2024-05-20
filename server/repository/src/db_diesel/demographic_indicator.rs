use super::{
    demographic_indicator_row::{
        demographic_indicator, demographic_indicator::dsl as demographic_indicator_dsl,
    },
    DBType, StorageConnection,
};
use diesel::prelude::*;

use crate::{
    demographic_indicator_row::DemographicIndicatorRow,
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    repository_error::RepositoryError,
};

use crate::{EqualFilter, Sort};

#[derive(PartialEq, Debug, Clone)]
pub struct DemographicIndicator {
    pub demographic_indicator_row: DemographicIndicatorRow,
}

#[derive(Clone, Default)]
pub struct DemographicIndicatorFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<EqualFilter<String>>,
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
        self.query(Some(filter), None)
    }

    pub fn query(
        &self,
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

        let result = query.load::<DemographicIndicatorRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedLogQuery = demographic_indicator::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<DemographicIndicatorFilter>) -> BoxedLogQuery {
    let mut query = demographic_indicator::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, demographic_indicator_dsl::id);
        apply_equal_filter!(query, filter.name, demographic_indicator_dsl::name);
    }
    query
}

pub fn to_domain(demographic_indicator_row: DemographicIndicatorRow) -> DemographicIndicator {
    DemographicIndicator {
        demographic_indicator_row,
    }
}

impl DemographicIndicatorFilter {
    pub fn new() -> DemographicIndicatorFilter {
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
