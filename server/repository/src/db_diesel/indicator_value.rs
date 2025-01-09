use super::{
    indicator_value_row::{indicator_value, IndicatorValueRow},
    name_link_row::name_link,
    name_row::name,
    DBType, NameLinkRow, NameRow, StorageConnection,
};

use crate::{diesel_macros::apply_equal_filter, repository_error::RepositoryError};

use crate::{EqualFilter, Pagination};

use diesel::{
    dsl::{InnerJoin, IntoBoxed},
    prelude::*,
};

pub struct IndicatorValueRepository<'a> {
    connection: &'a StorageConnection,
}

#[derive(Clone, Debug, PartialEq, Default)]
pub struct IndicatorValueFilter {
    pub id: Option<EqualFilter<String>>,
    pub customer_name_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub period_id: Option<EqualFilter<String>>,
    pub indicator_line_id: Option<EqualFilter<String>>,
    pub indicator_column_id: Option<EqualFilter<String>>,
}

type IndicatorValueJoin = (IndicatorValueRow, (NameLinkRow, NameRow));

impl IndicatorValueFilter {
    pub fn new() -> IndicatorValueFilter {
        Self::default()
    }
    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }
    pub fn customer_name_id(mut self, filter: EqualFilter<String>) -> Self {
        self.customer_name_id = Some(filter);
        self
    }
    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }
    pub fn period_id(mut self, filter: EqualFilter<String>) -> Self {
        self.period_id = Some(filter);
        self
    }
    pub fn indicator_line_id(mut self, filter: EqualFilter<String>) -> Self {
        self.indicator_line_id = Some(filter);
        self
    }
    pub fn indicator_column_id(mut self, filter: EqualFilter<String>) -> Self {
        self.indicator_column_id = Some(filter);
        self
    }
}

impl<'a> IndicatorValueRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        IndicatorValueRepository { connection }
    }

    pub fn count(&self, filter: Option<IndicatorValueFilter>) -> Result<i64, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(
        &self,
        filter: IndicatorValueFilter,
    ) -> Result<Option<IndicatorValueRow>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(
        &self,
        filter: IndicatorValueFilter,
    ) -> Result<Vec<IndicatorValueRow>, RepositoryError> {
        self.query(Pagination::all(), Some(filter))
    }

    pub fn create_filtered_query(filter: Option<IndicatorValueFilter>) -> BoxedIndicatorQuery {
        let mut query = indicator_value::table
            .inner_join(name_link::table.inner_join(name::table))
            .into_boxed();

        if let Some(f) = filter {
            apply_equal_filter!(query, f.id, indicator_value::id);
            apply_equal_filter!(query, f.customer_name_id, name::id);
            apply_equal_filter!(query, f.store_id, indicator_value::store_id);
            apply_equal_filter!(query, f.period_id, indicator_value::period_id);
            apply_equal_filter!(
                query,
                f.indicator_line_id,
                indicator_value::indicator_line_id
            );
            apply_equal_filter!(
                query,
                f.indicator_column_id,
                indicator_value::indicator_column_id
            );
        }

        query
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<IndicatorValueFilter>,
    ) -> Result<Vec<IndicatorValueRow>, RepositoryError> {
        let query = Self::create_filtered_query(filter);

        // Debug diesel query
        // println!("{}", diesel::debug_query::<DBType, _>(&query).to_string());

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<IndicatorValueJoin>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

fn to_domain((indicator_value_row, (name_link_row, _)): IndicatorValueJoin) -> IndicatorValueRow {
    IndicatorValueRow {
        id: indicator_value_row.id,
        customer_name_link_id: name_link_row.id,
        store_id: indicator_value_row.store_id,
        period_id: indicator_value_row.period_id,
        indicator_line_id: indicator_value_row.indicator_line_id,
        indicator_column_id: indicator_value_row.indicator_column_id,
        value: indicator_value_row.value,
    }
}

type BoxedIndicatorQuery = IntoBoxed<
    'static,
    InnerJoin<indicator_value::table, InnerJoin<name_link::table, name::table>>,
    DBType,
>;
