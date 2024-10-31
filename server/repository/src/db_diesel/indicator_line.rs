use super::{
    indicator_line_row::{indicator_line, IndicatorLineRow},
    DBType, StorageConnection,
};

use crate::{
    diesel_macros::{apply_equal_filter, apply_string_filter},
    repository_error::RepositoryError,
};

use crate::{EqualFilter, Pagination, StringFilter};

use diesel::prelude::*;

pub struct IndicatorRepository<'a> {
    connection: &'a StorageConnection,
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct IndicatorFilter {
    pub id: Option<EqualFilter<String>>,
    pub program_indicator_id: Option<EqualFilter<String>>,
    pub code: Option<StringFilter>,
}

impl<'a> IndicatorRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        IndicatorRepository { connection }
    }

    pub fn count(&self, filter: Option<IndicatorFilter>) -> Result<i64, RepositoryError> {
        // TODO (beyond M1), check that store_id matches current store
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: IndicatorFilter,
    ) -> Result<Vec<IndicatorLineRow>, RepositoryError> {
        self.query(Pagination::new(), Some(filter))
    }

    pub fn create_filtered_query(filter: Option<IndicatorFilter>) -> BoxedIndicatorQuery {
        let mut query = indicator_line::table.into_boxed();
        // Filter out inactive program_indicators by default
        query = query.filter(indicator_line::is_active.eq(true));

        if let Some(f) = filter {
            apply_equal_filter!(query, f.id, indicator_line::id);
            apply_equal_filter!(
                query,
                f.program_indicator_id,
                indicator_line::program_indicator_id
            );
            apply_string_filter!(query, f.code, indicator_line::code);
        }

        query
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<IndicatorFilter>,
    ) -> Result<Vec<IndicatorLineRow>, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<IndicatorLineRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}
type BoxedIndicatorQuery = indicator_line::BoxedQuery<'static, DBType>;

impl IndicatorFilter {
    pub fn new() -> IndicatorFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn program_indicator_id(mut self, filter: EqualFilter<String>) -> Self {
        self.program_indicator_id = Some(filter);
        self
    }

    pub fn code(mut self, filter: StringFilter) -> Self {
        self.code = Some(filter);
        self
    }
}
