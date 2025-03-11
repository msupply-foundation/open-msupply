use super::{
    reason_option_row::{reason_option, ReasonOptionRow, ReasonOptionType},
    DBType, StorageConnection,
};
use diesel::prelude::*;
use util::inline_init;

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    repository_error::RepositoryError,
};

use crate::{EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone)]
pub struct ReasonOption {
    pub reason_option_row: ReasonOptionRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct ReasonOptionFilter {
    pub id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<ReasonOptionType>>,
    pub is_active: Option<bool>,
}

#[derive(PartialEq, Debug)]
pub enum ReasonOptionSortField {
    ReasonOptionType,
    Reason,
}

pub type ReasonOptionSort = Sort<ReasonOptionSortField>;

pub struct ReasonOptionRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ReasonOptionRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ReasonOptionRepository { connection }
    }

    pub fn count(&self, filter: Option<ReasonOptionFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_by_filter(
        &self,
        filter: ReasonOptionFilter,
    ) -> Result<Vec<ReasonOption>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ReasonOptionFilter>,
        sort: Option<ReasonOptionSort>,
    ) -> Result<Vec<ReasonOption>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                ReasonOptionSortField::ReasonOptionType => {
                    apply_sort_no_case!(query, sort, reason_option::type_)
                }
                ReasonOptionSortField::Reason => {
                    apply_sort_no_case!(query, sort, reason_option::reason)
                }
            }
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<ReasonOptionRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedReasonOptionQuery = reason_option::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<ReasonOptionFilter>) -> BoxedReasonOptionQuery {
    let mut query = reason_option::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, reason_option::id);
        apply_equal_filter!(query, filter.r#type, reason_option::type_);
        if let Some(value) = filter.is_active {
            query = query.filter(reason_option::is_active.eq(value));
        }
    }

    query
}

fn to_domain(reason_option_row: ReasonOptionRow) -> ReasonOption {
    ReasonOption { reason_option_row }
}

impl ReasonOptionFilter {
    pub fn new() -> ReasonOptionFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<ReasonOptionType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn is_active(mut self, filter: bool) -> Self {
        self.is_active = Some(filter);
        self
    }
}

impl ReasonOptionType {
    pub fn equal_to(&self) -> EqualFilter<Self> {
        inline_init(|r: &mut EqualFilter<Self>| r.equal_to = Some(self.clone()))
    }
}
