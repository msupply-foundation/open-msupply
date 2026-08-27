use super::{sync_log_row::sync_log, StorageConnection};

use crate::{
    diesel_macros::{
        apply_date_time_filter, apply_equal_filter, apply_sort, apply_sort_asc_nulls_first,
    },
    DBType, DatetimeFilter, EqualFilter, Pagination, RepositoryError, Sort, SyncLogV5V6Row,
};

use diesel::prelude::*;

#[derive(Debug, PartialEq, Clone)]
pub struct SyncLog {
    pub sync_log_row: SyncLogV5V6Row,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct SyncLogV5V6Filter {
    pub id: Option<EqualFilter<String>>,
    pub prepare_initial_finished_datetime: Option<DatetimeFilter>,
    pub integration_finished_datetime: Option<DatetimeFilter>,
    pub finished_datetime: Option<DatetimeFilter>,
    pub error_message: Option<EqualFilter<String>>,
}

#[derive(PartialEq, Debug)]
pub enum SyncLogV5V6SortField {
    StartedDatetime,
    DoneDatetime,
}

pub type SyncLogV5V6Sort = Sort<SyncLogV5V6SortField>;

pub struct SyncLogV5V6Repository<'a> {
    connection: &'a StorageConnection,
}

impl<'a> SyncLogV5V6Repository<'a> {
    pub fn new(connection: &'a StorageConnection) -> Self {
        SyncLogV5V6Repository { connection }
    }

    pub fn count(&self, filter: Option<SyncLogV5V6Filter>) -> Result<i64, RepositoryError> {
        let query = create_filtered_query(filter);
        Ok(query
            .count()
            .get_result(self.connection.lock().connection())?)
    }

    pub fn query_one(&self, filter: SyncLogV5V6Filter) -> Result<Option<SyncLog>, RepositoryError> {
        Ok(self.query(Pagination::one(), Some(filter), None)?.pop())
    }

    pub fn query_by_filter(&self, filter: SyncLogV5V6Filter) -> Result<Vec<SyncLog>, RepositoryError> {
        self.query(Pagination::new(), Some(filter), None)
    }

    pub fn query(
        &self,
        pagination: Pagination,
        filter: Option<SyncLogV5V6Filter>,
        sort: Option<SyncLogV5V6Sort>,
    ) -> Result<Vec<SyncLog>, RepositoryError> {
        let mut query = create_filtered_query(filter);
        if let Some(sort) = sort {
            match sort.key {
                SyncLogV5V6SortField::StartedDatetime => {
                    // started_datetime is not nullable
                    apply_sort!(query, sort, sync_log::started_datetime)
                }
                SyncLogV5V6SortField::DoneDatetime => {
                    // If nulls last on desc search and nulls first on asc search is more
                    // convenient for sync log rows datetimes that are nullable (see get_initialisation_status)
                    apply_sort_asc_nulls_first!(query, sort, sync_log::finished_datetime)
                }
            }
        } else {
            query = query.order(sync_log::started_datetime.asc())
        }

        let final_query = query
            .offset(pagination.offset as i64)
            .limit(pagination.limit as i64);

        // Debug diesel query
        // println!(
        //     "{}",
        //     diesel::debug_query::<crate::DBType, _>(&final_query).to_string()
        // );

        let result = final_query.load::<SyncLogV5V6Row>(self.connection.lock().connection())?;

        Ok(result
            .into_iter()
            .map(SyncLogV5V6Row::or_latest_row)
            .map(to_domain)
            .collect())
    }
}

type BoxedSyncLogQuery = sync_log::BoxedQuery<'static, DBType>;

fn create_filtered_query(filter: Option<SyncLogV5V6Filter>) -> BoxedSyncLogQuery {
    let mut query = sync_log::table.into_boxed();

    if let Some(f) = filter {
        let SyncLogV5V6Filter {
            id,
            integration_finished_datetime,
            prepare_initial_finished_datetime,
            finished_datetime,
            error_message,
        } = f;
        apply_equal_filter!(query, id, sync_log::id);
        apply_date_time_filter!(
            query,
            prepare_initial_finished_datetime,
            sync_log::prepare_initial_finished_datetime
        );
        apply_date_time_filter!(
            query,
            integration_finished_datetime,
            sync_log::integration_finished_datetime
        );
        apply_date_time_filter!(query, finished_datetime, sync_log::finished_datetime);
        apply_equal_filter!(query, error_message, sync_log::error_message);
    }

    query
}

fn to_domain(sync_log_row: SyncLogV5V6Row) -> SyncLog {
    SyncLog { sync_log_row }
}

impl SyncLogV5V6Filter {
    pub fn new() -> SyncLogV5V6Filter {
        SyncLogV5V6Filter::default()
    }

    pub fn prepare_initial_finished_datetime(mut self, value: DatetimeFilter) -> SyncLogV5V6Filter {
        self.prepare_initial_finished_datetime = Some(value);
        self
    }

    pub fn integration_finished_datetime(mut self, value: DatetimeFilter) -> Self {
        self.integration_finished_datetime = Some(value);
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
