use super::{
    activity_log_row::{activity_log, activity_log::dsl as activity_log_dsl},
    ActivityLogRow, DBType, StorageConnection,
};
use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_equal_filter, apply_sort_no_case},
    repository_error::RepositoryError,
    ActivityLogType,
};

use crate::{EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone)]
pub struct ActivityLog {
    pub activity_log_row: ActivityLogRow,
}

#[derive(Clone, PartialEq, Debug, Default)]
pub struct ActivityLogFilter {
    pub id: Option<EqualFilter<String>>,
    pub r#type: Option<EqualFilter<ActivityLogType>>,
    pub user_id: Option<EqualFilter<String>>,
    pub store_id: Option<EqualFilter<String>>,
    pub record_id: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum ActivityLogSortField {
    Id,
    ActivityLogType,
    UserId,
    RecordId,
}

pub type ActivityLogSort = Sort<ActivityLogSortField>;

pub struct ActivityLogRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> ActivityLogRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        ActivityLogRepository { connection }
    }

    pub fn count(&self, filter: Option<ActivityLogFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(
        &self,
        filter: ActivityLogFilter,
    ) -> Result<Vec<ActivityLog>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<ActivityLogFilter>,
        sort: Option<ActivityLogSort>,
    ) -> Result<Vec<ActivityLog>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                ActivityLogSortField::Id => {
                    apply_sort_no_case!(query, sort, activity_log_dsl::id)
                }
                ActivityLogSortField::ActivityLogType => {
                    apply_sort_no_case!(query, sort, activity_log_dsl::type_)
                }
                ActivityLogSortField::UserId => {
                    apply_sort_no_case!(query, sort, activity_log_dsl::user_id)
                }
                ActivityLogSortField::RecordId => {
                    apply_sort_no_case!(query, sort, activity_log_dsl::record_id)
                }
            }
        } else {
            query = query.order(activity_log_dsl::datetime.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<ActivityLogRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedLogQuery = activity_log::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<ActivityLogFilter>) -> BoxedLogQuery {
    let mut query = activity_log::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, activity_log_dsl::id);
        apply_equal_filter!(query, filter.r#type, activity_log_dsl::type_);
        apply_equal_filter!(query, filter.user_id, activity_log_dsl::user_id);
        apply_equal_filter!(query, filter.store_id, activity_log_dsl::store_id);
        apply_equal_filter!(query, filter.record_id, activity_log_dsl::record_id);
    }

    query
}

fn to_domain(activity_log_row: ActivityLogRow) -> ActivityLog {
    ActivityLog { activity_log_row }
}

impl ActivityLogFilter {
    pub fn new() -> ActivityLogFilter {
        Self::default()
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn r#type(mut self, filter: EqualFilter<ActivityLogType>) -> Self {
        self.r#type = Some(filter);
        self
    }

    pub fn user_id(mut self, filter: EqualFilter<String>) -> Self {
        self.user_id = Some(filter);
        self
    }

    pub fn store_id(mut self, filter: EqualFilter<String>) -> Self {
        self.store_id = Some(filter);
        self
    }

    pub fn record_id(mut self, filter: EqualFilter<String>) -> Self {
        self.record_id = Some(filter);
        self
    }
}
