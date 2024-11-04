use super::{
    indicator_column_row::{indicator_column, IndicatorColumnRow},
    DBType, StorageConnection,
};

use crate::{diesel_macros::apply_equal_filter, repository_error::RepositoryError};

use crate::{EqualFilter, Pagination};

use diesel::prelude::*;

pub struct IndicatorColumnRepository<'a> {
    connection: &'a StorageConnection,
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct IndicatorColumnFilter {
    pub id: Option<EqualFilter<String>>,
    pub program_indicator_id: Option<EqualFilter<String>>,
}

impl<'a> IndicatorColumnRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        IndicatorColumnRepository { connection }
    }

    pub fn count(&self, filter: Option<IndicatorColumnFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: IndicatorColumnFilter,
    ) -> Result<Vec<IndicatorColumnRow>, RepositoryError> {
        self.query(Pagination::new(), Some(filter))
    }

    pub fn create_filtered_query(filter: Option<IndicatorColumnFilter>) -> BoxedIndicatorQuery {
        let mut query = indicator_column::table.into_boxed();
        // Filter out inactive program_indicators by default
        query = query.filter(indicator_column::is_active.eq(true));

        if let Some(f) = filter {
            apply_equal_filter!(query, f.id, indicator_column::id);
            apply_equal_filter!(
                query,
                f.program_indicator_id,
                indicator_column::program_indicator_id
            );
        }

        query
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<IndicatorColumnFilter>,
    ) -> Result<Vec<IndicatorColumnRow>, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<IndicatorColumnRow>(self.connection.lock().connection())?;

        Ok(result)
    }
}
type BoxedIndicatorQuery = indicator_column::BoxedQuery<'static, DBType>;

impl IndicatorColumnFilter {
    pub fn new() -> IndicatorColumnFilter {
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
}
