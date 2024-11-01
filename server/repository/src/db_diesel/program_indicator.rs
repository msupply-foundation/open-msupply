use super::{
    program_indicator_row::program_indicator, DBType, ProgramIndicatorRow, Sort, StorageConnection,
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort},
    repository_error::RepositoryError,
};

use crate::{EqualFilter, Pagination};

use diesel::prelude::*;

pub struct ProgramIndicatorRepository<'a> {
    connection: &'a StorageConnection,
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct ProgramIndicatorFilter {
    pub id: Option<EqualFilter<String>>,
    pub program_id: Option<EqualFilter<String>>,
}

pub enum ProgramIndicatorSortField {
    ProgramId,
    Code,
}

pub type ProgramIndicatorSort = Sort<ProgramIndicatorSortField>;

impl<'a> ProgramIndicatorRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ProgramIndicatorRepository { connection }
    }

    pub fn count(&self, filter: Option<ProgramIndicatorFilter>) -> Result<i64, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: ProgramIndicatorFilter,
    ) -> Result<Vec<ProgramIndicatorRow>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn create_filtered_query(
        filter: Option<ProgramIndicatorFilter>,
    ) -> BoxedProgramIndicatorQuery {
        let mut query = program_indicator::table.into_boxed();
        // Filter out inactive program_indicators by default
        query = query.filter(program_indicator::is_active.eq(true));

        if let Some(f) = filter {
            apply_equal_filter!(query, f.id, program_indicator::id);
            apply_equal_filter!(query, f.program_id, program_indicator::program_id);
        }

        query
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ProgramIndicatorFilter>,
        sort: Option<ProgramIndicatorSort>,
    ) -> Result<Vec<ProgramIndicatorRow>, RepositoryError> {
        let mut query = Self::create_filtered_query(filter);

        if let Some(sort) = sort {
            match sort.key {
                ProgramIndicatorSortField::ProgramId => {
                    apply_sort!(query, sort, program_indicator::program_id)
                }
                ProgramIndicatorSortField::Code => {
                    apply_sort!(query, sort, program_indicator::code)
                }
            }
        } else {
            query = query.order(program_indicator::program_id)
        }

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<ProgramIndicatorRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}
type BoxedProgramIndicatorQuery = program_indicator::BoxedQuery<'static, DBType>;

impl ProgramIndicatorFilter {
    pub fn new() -> ProgramIndicatorFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn program_id(mut self, filter: EqualFilter<String>) -> Self {
        self.program_id = Some(filter);
        self
    }
}
