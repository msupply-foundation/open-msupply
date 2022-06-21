use super::{
    log_row::{log, log::dsl as log_dsl},
    DBType, LogRow, StorageConnection,
};
use diesel::prelude::*;

use crate::{
    diesel_macros::{apply_date_time_filter, apply_equal_filter, apply_sort_no_case},
    repository_error::RepositoryError,
    DatetimeFilter, LogType,
};

use crate::{EqualFilter, Pagination, Sort};

#[derive(PartialEq, Debug, Clone)]
pub struct Log {
    pub log_row: LogRow,
}

#[derive(Clone, PartialEq, Debug)]
pub struct LogFilter {
    pub id: Option<EqualFilter<String>>,
    pub log_type: Option<EqualFilter<LogType>>,
    pub user_id: Option<EqualFilter<String>>,
    pub record_id: Option<EqualFilter<String>>,
    pub created_datetime: Option<EqualFilter<DatetimeFilter>>,
}

#[derive(PartialEq, Debug)]
pub enum LogSortField {
    Id,
    LogType,
    UserId,
    RecordId,
}

pub type LogSort = Sort<LogSortField>;

pub struct LogReposititory<'a> {
    connection: &'a StorageConnection,
}

impl<'a> LogReposititory<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        LogReposititory { connection }
    }

    pub fn count(&self, filter: Option<LogFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_by_filter(&self, filter: LogFilter) -> Result<Vec<Log>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<LogFilter>,
        sort: Option<LogSort>,
    ) -> Result<Vec<Log>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                LogSortField::Id => {
                    apply_sort_no_case!(query, sort, log_dsl::id)
                }
                LogSortField::LogType => {
                    apply_sort_no_case!(query, sort, log_dsl::log_type)
                }
                LogSortField::UserId => {
                    apply_sort_no_case!(query, sort, log_dsl::user_id)
                }
                LogSortField::RecordId => {
                    apply_sort_no_case!(query, sort, log_dsl::record_id)
                }
            }
        } else {
            query = query.order(log_dsl::created_datetime.asc())
        }

        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<LogRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedLogQuery = log::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<LogFilter>) -> BoxedLogQuery {
    let mut query = log::table.into_boxed();

    if let Some(filter) = filter {
        apply_equal_filter!(query, filter.id, log_dsl::id);
        apply_equal_filter!(query, filter.log_type, log_dsl::log_type);
        apply_equal_filter!(query, filter.user_id, log_dsl::user_id);
        apply_equal_filter!(query, filter.record_id, log_dsl::record_id);
    }

    query
}

pub fn to_domain(log_row: LogRow) -> Log {
    Log { log_row }
}

impl LogFilter {
    pub fn new() -> LogFilter {
        LogFilter {
            id: None,
            log_type: None,
            user_id: None,
            record_id: None,
            created_datetime: None,
        }
    }

    pub fn id(mut self, filter: EqualFilter<String>) -> Self {
        self.id = Some(filter);
        self
    }

    pub fn log_type(mut self, filter: EqualFilter<LogType>) -> Self {
        self.log_type = Some(filter);
        self
    }

    pub fn user_id(mut self, filter: EqualFilter<String>) -> Self {
        self.user_id = Some(filter);
        self
    }

    pub fn record_id(mut self, filter: EqualFilter<String>) -> Self {
        self.record_id = Some(filter);
        self
    }

    pub fn created_datetime(mut self, filter: EqualFilter<DatetimeFilter>) -> Self {
        self.created_datetime = Some(filter);
        self
    }
}
