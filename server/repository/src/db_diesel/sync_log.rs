use super::{
    sync_log_row::{sync_log, sync_log::dsl as sync_log_dsl},
    StorageConnection,
};

use crate::{
    diesel_macros::{
        apply_date_time_filter, apply_equal_filter, apply_sort, apply_sort_asc_nulls_first,
    },
    DBType, DatetimeFilter, EqualFilter, Pagination, RepositoryError, Sort, SyncLogRow,
};

use diesel::prelude::*;

#[derive(Debug, PartialEq, Clone)]
pub struct SyncLog {
    pub sync_log_row: SyncLogRow,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct SyncLogFilter {
    pub id: Option<EqualFilter<String>>,
    pub prepare_initial_finished_datetime: Option<DatetimeFilter>,
    pub finished_datetime: Option<DatetimeFilter>,
    pub error_message: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum SyncLogSortField {
    StartedDatetime,
    DoneDatetime,
}

pub type SyncLogSort = Sort<SyncLogSortField>;

pub struct SyncLogRepository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SyncLogRepository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SyncLogRepository { connection }
    }

    pub fn count(&self, filter: Option<SyncLogFilter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(&self, filter: SyncLogFilter) -> Result<Option<SyncLog>, RepositoryError> {
        Ok(self.query(Pagination::one(), Some(filter), None)?.pop())
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
                    // started_datetime is not nullable
                    apply_sort!(query, sort, sync_log_dsl::started_datetime)
                }
                SyncLogSortField::DoneDatetime => {
                    // If nulls last on desc search and nulls first on asc search is more
                    // convenient for sync log rows datetimes that are nullable (see get_initialisation_status)
                    apply_sort_asc_nulls_first!(query, sort, sync_log_dsl::finished_datetime)
                }
            }
        } else {
            query = query.order(sync_log_dsl::started_datetime.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<SyncLogRow>(self.connection.lock().connection())?;

        Ok(result.into_iter().map(to_domain).collect())
    }
}

type BoxedSyncLogQuery = sync_log::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<SyncLogFilter>) -> BoxedSyncLogQuery {
    let mut query = sync_log::table.into_boxed();

    if let Some(f) = filter {
        let SyncLogFilter {
            id,
            prepare_initial_finished_datetime,
            finished_datetime,
            error_message,
        } = f;
        apply_equal_filter!(query, id, sync_log_dsl::id);
        apply_date_time_filter!(
            query,
            prepare_initial_finished_datetime,
            sync_log_dsl::prepare_initial_finished_datetime
        );
        apply_date_time_filter!(query, finished_datetime, sync_log_dsl::finished_datetime);
        apply_equal_filter!(query, error_message, sync_log_dsl::error_message);
    }

    query
}

fn to_domain(sync_log_row: SyncLogRow) -> SyncLog {
    SyncLog { sync_log_row }
}

impl SyncLogFilter {
    pub fn new() -> SyncLogFilter {
        SyncLogFilter::default()
    }

    pub fn prepare_initial_finished_datetime(mut self, value: DatetimeFilter) -> SyncLogFilter {
        self.prepare_initial_finished_datetime = Some(value);
        self
    }

    pub fn finished_datetime(mut self, value: DatetimeFilter) -> Self {
        self.finished_datetime = Some(value);
        self
    }

    pub fn error_message(mut self, value: EqualFilter<String>) -> Self {
        self.error_message = Some(value);
        self
    }
}
