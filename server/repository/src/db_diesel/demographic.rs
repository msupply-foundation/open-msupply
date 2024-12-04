use super::{
    demographic_row::{demographic, demographic::dsl as demographic_dsl},
    DBType, StorageConnection,
};
use diesel::prelude::*;

use crate::{
    demographic_row::DemographicRow,
    diesel_macros::{apply_equal_filter, apply_sort_no_case, apply_string_filter},
    repository_error::RepositoryError,
    Pagination, StringFilter,
};

pub type Demographic = DemographicRow;

use crate::{EqualFilter, Sort};

#[derive(Clone, Default)]
pub struct DemographicFilter {
    pub id: Option<EqualFilter<String>>,
    pub name: Option<StringFilter>,
}

pub enum DemographicSortField {
    Id,
    Name,
}

pub type DemographicSort = Sort<DemographicSortField>;

pub struct DemographicRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> DemographicRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        DemographicRepository { connection }
    }

    pub fn count(&self, filter: Option<DemographicFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: DemographicFilter,
    ) -> Result<Vec<Demographic>, RepositoryError> {
        self.query(Pagination::all(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<DemographicFilter>,
        sort: Option<DemographicSort>,
    ) -> Result<Vec<Demographic>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                DemographicSortField::Id => {
                    apply_sort_no_case!(query, sort, demographic_dsl::id)
                }
                DemographicSortField::Name => {
                    apply_sort_no_case!(query, sort, demographic_dsl::name)
                }
            }
        } else {
            query = query.order(demographic_dsl::name.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        let result = final_query.load::<DemographicRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedLogQuery = demographic::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<DemographicFilter>) -> BoxedLogQuery {
    let mut query = demographic::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, demographic_dsl::id);
        apply_string_filter!(query, filter.name, demographic_dsl::name);
    }
    query
}

fn to_domain(demographic_row: DemographicRow) -> Demographic {
    demographic_row
}

impl DemographicFilter {
    pub fn new() -> DemographicFilter {
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
}
