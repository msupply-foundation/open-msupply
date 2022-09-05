use super::{
    sync_log_row::{sync_log, sync_log::dsl as sync_log_dsl},
    StorageConnection,
};

use crate::{
    diesel_macros::{
        apply_date_time_filter, apply_equal_filter, apply_simple_string_filter, apply_sort,
    },
    DBType, DatetimeFilter, EqualFilter, Pagination, RepositoryError, SimpleStringFilter, Sort,
    SyncLogRow,
};

use diesel::prelude::*;

#[derive(Debug, PartialEq, Clone)]
pub struct SyncLog {
    pub sync_log_row: SyncLogRow,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct SyncLogFilter {
    pub id: Option<EqualFilter<String>>,
    pub started_datetime: Option<DatetimeFilter>,
    pub done_endtime: Option<DatetimeFilter>,
    pub prepare_initial_start_datetime: Option<DatetimeFilter>,
    pub prepare_initial_done_datetime: Option<DatetimeFilter>,
    pub push_start_datetime: Option<DatetimeFilter>,
    pub push_done_datetime: Option<DatetimeFilter>,
    pub push_progress_start: Option<EqualFilter<i32>>,
    pub push_progress_done: Option<EqualFilter<i32>>,
    pub pull_central_start_datetime: Option<DatetimeFilter>,
    pub pull_central_done_datetime: Option<DatetimeFilter>,
    pub pull_central_progress_start: Option<EqualFilter<i32>>,
    pub pull_central_progress_done: Option<EqualFilter<i32>>,
    pub pull_remote_start_datetime: Option<DatetimeFilter>,
    pub pull_remote_done_datetime: Option<DatetimeFilter>,
    pub pull_remote_progress_start: Option<EqualFilter<i32>>,
    pub pull_remote_progress_done: Option<EqualFilter<i32>>,
    pub integration_start_datetime: Option<DatetimeFilter>,
    pub integration_done_datetime: Option<DatetimeFilter>,
    pub error_message: Option<SimpleStringFilter>,
}

#[derive(PartialEq, Debug)]
pub enum SyncLogSortField {
    StartedDatetime,
    DoneEndtime,
}

pub type SyncLogSort = Sort<SyncLogSortField>;

impl SyncLogFilter {
    pub fn new() -> SyncLogFilter {
        SyncLogFilter::default()
    }

    pub fn id(mut self, id: Option<EqualFilter<String>>) -> SyncLogFilter {
        self.id = id;
        self
    }

    pub fn started_datetime(mut self, started_datetime: Option<DatetimeFilter>) -> SyncLogFilter {
        self.started_datetime = started_datetime;
        self
    }

    pub fn done_endtime(mut self, done_endtime: Option<DatetimeFilter>) -> SyncLogFilter {
        self.done_endtime = done_endtime;
        self
    }

    pub fn prepare_initial_start_datetime(
        mut self,
        prepare_initial_start_datetime: Option<DatetimeFilter>,
    ) -> SyncLogFilter {
        self.prepare_initial_start_datetime = prepare_initial_start_datetime;
        self
    }

    pub fn prepare_initial_done_datetime(mut self, filter: Option<DatetimeFilter>) -> Self {
        self.prepare_initial_done_datetime = filter;
        self
    }

    pub fn push_start_datetime(
        mut self,
        push_start_datetime: Option<DatetimeFilter>,
    ) -> SyncLogFilter {
        self.push_start_datetime = push_start_datetime;
        self
    }

    pub fn push_done_datetime(
        mut self,
        push_done_datetime: Option<DatetimeFilter>,
    ) -> SyncLogFilter {
        self.push_done_datetime = push_done_datetime;
        self
    }

    pub fn push_progress_start(
        mut self,
        push_progress_start: Option<EqualFilter<i32>>,
    ) -> SyncLogFilter {
        self.push_progress_start = push_progress_start;
        self
    }

    pub fn push_progress_done(
        mut self,
        push_progress_done: Option<EqualFilter<i32>>,
    ) -> SyncLogFilter {
        self.push_progress_done = push_progress_done;
        self
    }

    pub fn pull_central_start_datetime(
        mut self,
        pull_central_start_datetime: Option<DatetimeFilter>,
    ) -> SyncLogFilter {
        self.pull_central_start_datetime = pull_central_start_datetime;
        self
    }

    pub fn pull_central_done_datetime(
        mut self,
        pull_central_done_datetime: Option<DatetimeFilter>,
    ) -> SyncLogFilter {
        self.pull_central_done_datetime = pull_central_done_datetime;
        self
    }

    pub fn pull_central_progress_start(
        mut self,
        pull_central_progress_start: Option<EqualFilter<i32>>,
    ) -> SyncLogFilter {
        self.pull_central_progress_start = pull_central_progress_start;
        self
    }

    pub fn pull_central_progress_done(
        mut self,
        pull_central_progress_done: Option<EqualFilter<i32>>,
    ) -> SyncLogFilter {
        self.pull_central_progress_done = pull_central_progress_done;
        self
    }

    pub fn pull_remote_start_datetime(
        mut self,
        pull_remote_start_datetime: Option<DatetimeFilter>,
    ) -> SyncLogFilter {
        self.pull_remote_start_datetime = pull_remote_start_datetime;
        self
    }

    pub fn pull_remote_done_datetime(
        mut self,
        pull_remote_done_datetime: Option<DatetimeFilter>,
    ) -> SyncLogFilter {
        self.pull_remote_done_datetime = pull_remote_done_datetime;
        self
    }

    pub fn pull_remote_progress_start(
        mut self,
        pull_remote_progress_start: Option<EqualFilter<i32>>,
    ) -> SyncLogFilter {
        self.pull_remote_progress_start = pull_remote_progress_start;
        self
    }

    pub fn pull_remote_progress_done(
        mut self,
        pull_remote_progress_done: Option<EqualFilter<i32>>,
    ) -> SyncLogFilter {
        self.pull_remote_progress_done = pull_remote_progress_done;
        self
    }

    pub fn integration_start_datetime(
        mut self,
        integration_start_datetime: Option<DatetimeFilter>,
    ) -> SyncLogFilter {
        self.integration_start_datetime = integration_start_datetime;
        self
    }

    pub fn integration_done_datetime(
        mut self,
        integration_done_datetime: Option<DatetimeFilter>,
    ) -> SyncLogFilter {
        self.integration_done_datetime = integration_done_datetime;
        self
    }

    pub fn error_message(mut self, error_message: Option<SimpleStringFilter>) -> SyncLogFilter {
        self.error_message = error_message;
        self
    }
}

pub struct SyncLogRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SyncLogRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SyncLogRepository { connection }
    }

    pub fn count(&self, filter: Option<SyncLogFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query.count().get_result(&self.connection.connection)?)
    }

    pub fn query_one(&self, filter: SyncLogFilter) -> Result<Option<SyncLog>, RepositoryError> {
        Ok(self.query_by_filter(filter)?.pop())
    }

    pub fn query_by_filter(&self, filter: SyncLogFilter) -> Result<Vec<SyncLog>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<SyncLogFilter>,
        sort: Option<SyncLogSort>,
    ) -> Result<Vec<SyncLog>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                SyncLogSortField::StartedDatetime => {
                    apply_sort!(query, sort, sync_log_dsl::started_datetime)
                }
                SyncLogSortField::DoneEndtime => {
                    apply_sort!(query, sort, sync_log_dsl::done_endtime)
                }
            }
        } else {
            query = query.order(sync_log_dsl::started_datetime.asc())
        }
        let result = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64)
            .load::<SyncLogRow>(&self.connection.connection)?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedSyncLogQuery = sync_log::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<SyncLogFilter>) -> BoxedSyncLogQuery {
    let mut query = sync_log::table.into_boxed();

    if let Some(f) = filter {
        apply_equal_filter!(query, f.id, sync_log_dsl::id);
        apply_date_time_filter!(query, f.started_datetime, sync_log_dsl::started_datetime);
        apply_date_time_filter!(query, f.done_endtime, sync_log_dsl::done_endtime);
        apply_date_time_filter!(
            query,
            f.prepare_initial_start_datetime,
            sync_log_dsl::prepare_initial_start_datetime
        );
        apply_date_time_filter!(
            query,
            f.prepare_initial_done_datetime,
            sync_log_dsl::prepare_initial_done_datetime
        );
        apply_date_time_filter!(
            query,
            f.push_start_datetime,
            sync_log_dsl::push_start_datetime
        );
        apply_date_time_filter!(
            query,
            f.push_done_datetime,
            sync_log_dsl::push_done_datetime
        );
        apply_equal_filter!(
            query,
            f.push_progress_start,
            sync_log_dsl::push_progress_start
        );
        apply_equal_filter!(
            query,
            f.push_progress_done,
            sync_log_dsl::push_progress_done
        );
        apply_date_time_filter!(
            query,
            f.pull_central_start_datetime,
            sync_log_dsl::pull_central_start_datetime
        );
        apply_date_time_filter!(
            query,
            f.pull_central_done_datetime,
            sync_log_dsl::pull_central_done_datetime
        );
        apply_equal_filter!(
            query,
            f.pull_central_progress_start,
            sync_log_dsl::pull_central_progress_start
        );
        apply_equal_filter!(
            query,
            f.pull_central_progress_done,
            sync_log_dsl::pull_central_progress_done
        );
        apply_date_time_filter!(
            query,
            f.pull_remote_start_datetime,
            sync_log_dsl::pull_remote_start_datetime
        );
        apply_date_time_filter!(
            query,
            f.pull_remote_done_datetime,
            sync_log_dsl::pull_remote_done_datetime
        );
        apply_equal_filter!(
            query,
            f.pull_remote_progress_start,
            sync_log_dsl::pull_remote_progress_start
        );
        apply_equal_filter!(
            query,
            f.pull_remote_progress_done,
            sync_log_dsl::pull_remote_progress_done
        );
        apply_date_time_filter!(
            query,
            f.integration_start_datetime,
            sync_log_dsl::integration_start_datetime
        );
        apply_date_time_filter!(
            query,
            f.integration_done_datetime,
            sync_log_dsl::integration_done_datetime
        );
        apply_simple_string_filter!(query, f.error_message, sync_log_dsl::error_message);
    }

    query
}

fn to_domain(sync_log_row: SyncLogRow) -> SyncLog {
    SyncLog { sync_log_row }
}
