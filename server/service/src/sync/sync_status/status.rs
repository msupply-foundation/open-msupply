use chrono::{NaiveDateTime, Utc};
use repository::{
    ChangelogRepository, DatetimeFilter, Pagination, RepositoryError, Sort, SyncLogFilter,
    SyncLogRepository, SyncLogRow, SyncLogSortField,
};
use util::Defaults;

use crate::{
    i32_to_u32,
    service_provider::ServiceContext,
    sync::{
        get_active_records_on_site_filter, remote_data_synchroniser, GetActiveStoresOnSiteError,
    },
};

#[derive(Debug, Clone, PartialEq)]

pub struct SyncStatus {
    pub started: NaiveDateTime,
    pub finished: Option<NaiveDateTime>,
}

#[derive(Debug, Clone, PartialEq)]
pub struct SyncStatusWithProgress {
    pub started: NaiveDateTime,
    pub finished: Option<NaiveDateTime>,
    pub total_progress: Option<u32>,
    pub done_progress: Option<u32>,
}

#[derive(Debug, Clone, PartialEq, Default)]
pub struct FullSyncStatus {
    pub is_syncing: bool,
    pub error: Option<String>,
    pub summary: SyncStatus,
    pub prepare_initial: Option<SyncStatus>,
    pub integration: Option<SyncStatus>,
    pub pull_central: Option<SyncStatusWithProgress>,
    pub pull_remote: Option<SyncStatusWithProgress>,
    pub push: Option<SyncStatusWithProgress>,
}

#[derive(Eq, PartialEq, Hash, Copy, Clone, Debug)]
pub enum SyncStatusType {
    Initial,
    Push,
    PullCentral,
    PullRemote,
    Integration,
}

#[derive(PartialEq, Debug)]
pub enum SyncState {
    /// Fuly initialised
    Initialised,
    /// Sync settings were set and sync was attempted at least once
    Initialising,
    /// Sync settings are not set and sync was not attempted
    PreInitialisation,
}

pub trait SyncStatusTrait: Sync + Send {
    fn get_latest_sync_status(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Option<FullSyncStatus>, RepositoryError> {
        get_latest_sync_status(ctx)
    }

    fn get_sync_state(&self, ctx: &ServiceContext) -> Result<SyncState, RepositoryError> {
        get_sync_state(ctx)
    }

    fn is_initialised(&self, ctx: &ServiceContext) -> Result<bool, RepositoryError> {
        Ok(self.get_sync_state(ctx)? == SyncState::Initialised)
    }

    fn is_sync_queue_initialised(&self, ctx: &ServiceContext) -> Result<bool, RepositoryError> {
        is_sync_queue_initialised(ctx)
    }

    fn number_of_records_in_push_queue(
        &self,
        ctx: &ServiceContext,
    ) -> Result<u64, NumberOfRecordsInPushQueueError> {
        number_of_records_in_push_queue(ctx)
    }
}

pub(crate) struct SyncStatusService;

impl SyncStatusTrait for SyncStatusService {}

/// * If there are no sync logs then: PreInitialisation
/// * If sync log sorted by done datetime has a value in done datetime: Initialised
/// * If sync log sorted by done datetime has not valule in done datetime: Initialising
fn get_sync_state(ctx: &ServiceContext) -> Result<SyncState, RepositoryError> {
    let sort = Sort {
        key: SyncLogSortField::DoneDatetime,
        desc: Some(true),
    };
    let latest_log_sorted_by_done_datetime = SyncLogRepository::new(&ctx.connection)
        .query(Pagination::one(), None, Some(sort))?
        .pop();

    let sync_state = match latest_log_sorted_by_done_datetime {
        None => SyncState::PreInitialisation,
        Some(sync_log) => match sync_log.sync_log_row.done_datetime {
            Some(_) => SyncState::Initialised,
            None => SyncState::Initialising,
        },
    };

    Ok(sync_state)
}

/// During initial sync remote server asks central server to initialise remote data
/// preparte initial done datetime is set on associated sync log, this is check to see
/// if synce queue was initialised
fn is_sync_queue_initialised(ctx: &ServiceContext) -> Result<bool, RepositoryError> {
    let log_with_done_prepare_initial_datetime = SyncLogRepository::new(&ctx.connection)
        .query_one(SyncLogFilter::new().prepare_initial_done_datetime(
            DatetimeFilter::before_or_equal_to(Utc::now().naive_utc()),
        ))?;

    Ok(log_with_done_prepare_initial_datetime.is_some())
}

fn get_latest_sync_status(ctx: &ServiceContext) -> Result<Option<FullSyncStatus>, RepositoryError> {
    let sort = Sort {
        key: SyncLogSortField::StartedDatetime,
        desc: Some(true),
    };

    let sync_log_row = match SyncLogRepository::new(&ctx.connection)
        .query(Pagination::one(), None, Some(sort))?
        .pop()
    {
        Some(sync_log_row) => sync_log_row,
        None => return Ok(None),
    };

    let SyncLogRow {
        id: _,
        started_datetime,
        done_datetime,
        prepare_initial_start_datetime,
        prepare_initial_done_datetime,
        push_start_datetime,
        push_done_datetime,
        push_progress_total,
        push_progress_done,
        pull_central_start_datetime,
        pull_central_done_datetime,
        pull_central_progress_total,
        pull_central_progress_done,
        pull_remote_start_datetime,
        pull_remote_done_datetime,
        pull_remote_progress_total,
        pull_remote_progress_done,
        integration_start_datetime,
        integration_done_datetime,
        error_message,
    } = sync_log_row.sync_log_row;

    let result = FullSyncStatus {
        is_syncing: done_datetime.is_none() && error_message.is_none(),
        error: error_message,
        summary: SyncStatus {
            started: started_datetime,
            finished: done_datetime,
        },
        prepare_initial: prepare_initial_start_datetime.map(|started| SyncStatus {
            started,
            finished: prepare_initial_done_datetime,
        }),
        integration: integration_start_datetime.map(|started| SyncStatus {
            started,
            finished: integration_done_datetime,
        }),
        pull_central: pull_central_start_datetime.map(|started| SyncStatusWithProgress {
            started,
            finished: pull_central_done_datetime,
            total_progress: pull_central_progress_total.map(i32_to_u32),
            done_progress: pull_central_progress_done.map(i32_to_u32),
        }),
        pull_remote: pull_remote_start_datetime.map(|started| SyncStatusWithProgress {
            started,
            finished: pull_remote_done_datetime,
            total_progress: pull_remote_progress_total.map(i32_to_u32),
            done_progress: pull_remote_progress_done.map(i32_to_u32),
        }),
        push: push_start_datetime.map(|started| SyncStatusWithProgress {
            started,
            finished: push_done_datetime,
            total_progress: push_progress_total.map(i32_to_u32),
            done_progress: push_progress_done.map(i32_to_u32),
        }),
    };
    Ok(Some(result))
}

#[derive(Debug)]
pub enum NumberOfRecordsInPushQueueError {
    DatabaseError(RepositoryError),
    SiteIdNotSet,
}

fn number_of_records_in_push_queue(
    ctx: &ServiceContext,
) -> Result<u64, NumberOfRecordsInPushQueueError> {
    use NumberOfRecordsInPushQueueError as Error;
    let changelog_repo = ChangelogRepository::new(&ctx.connection);

    let cursor =
        remote_data_synchroniser::get_push_cursor(&ctx.connection).map_err(Error::DatabaseError)?;

    let changelog_filter =
        get_active_records_on_site_filter(&ctx.connection).map_err(|error| match error {
            GetActiveStoresOnSiteError::DatabaseError(error) => Error::DatabaseError(error),
            GetActiveStoresOnSiteError::SiteIdNotSet => Error::SiteIdNotSet,
        })?;

    let change_logs_total = changelog_repo
        .count(cursor, changelog_filter)
        .map_err(Error::DatabaseError)?;

    Ok(change_logs_total)
}

impl Default for SyncStatus {
    fn default() -> Self {
        Self {
            started: Defaults::naive_date_time(),
            finished: Default::default(),
        }
    }
}
