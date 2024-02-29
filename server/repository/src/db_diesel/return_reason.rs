use super::{
    return_reason_row::{return_reason, return_reason::dsl as return_reason_dsl},
    DBType, StorageConnection,
};
use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    repository_error::RepositoryError,
    ReturnReasonRow,
};

use crate::{EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone)]
pub struct ReturnReason {
    pub return_reason_row: ReturnReasonRow,
}

#[derive(Clone, PartialEq, Debug)]
pub struct ReturnReasonFilter {
    pub id: Option<EqualFilter<String>>,
    pub is_active: Option<bool>,
}

#[derive(PartialEq, Debug)]
pub enum ReturnReasonSortField {
    Id,
    Reason,
}

pub type ReturnReasonSort = Sort<ReturnReasonSortField>;

pub struct ReturnReasonRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ReturnReasonRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ReturnReasonRepository { connection }
    }

    pub fn count(&self, filter: Option<ReturnReasonFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: ReturnReasonFilter,
    ) -> Result<Vec<ReturnReason>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ReturnReasonFilter>,
        sort: Option<ReturnReasonSort>,
    ) -> Result<Vec<ReturnReason>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                ReturnReasonSortField::Id => {
                    apply_sort_no_case!(query, sort, return_reason_dsl::id)
                }
                ReturnReasonSortField::Reason => {
                    apply_sort_no_case!(query, sort, return_reason_dsl::reason)
                }
            }
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<ReturnReasonRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedReturnQuery = return_reason::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<ReturnReasonFilter>) -> BoxedReturnQuery {
    let mut query = return_reason::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, return_reason_dsl::id);
        if let Some(value) = filter.is_active {
            query = query.filter(return_reason_dsl::is_active.eq(value));
        }
    }

    query
}

fn to_domain(return_reason_row: ReturnReasonRow) -> ReturnReason {
    ReturnReason { return_reason_row }
}

impl ReturnReasonFilter {
    pub fn new() -> ReturnReasonFilter {
        ReturnReasonFilter {
            id: None,
            is_active: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn is_active(mut self, filter: bool) -> Self {
        self.is_active = Some(filter);
        self
    }
}
