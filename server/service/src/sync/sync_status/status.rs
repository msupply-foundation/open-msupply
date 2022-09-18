use chrono::{NaiveDateTime, Utc};
use repository::{
    ChangelogRepository, DatetimeFilter, RepositoryError, SyncLogFilter, SyncLogRepository,
    SyncLogRow, SyncLogRowRepository,
};
use util::Defaults;

use crate::{
    i32_to_u32,
    service_provider::ServiceContext,
    sync::{
        get_active_records_on_site_filter, remote_data_synchroniser::RemoteSyncState,
        GetActiveStoresOnSiteError,
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

#[derive(Eq, PartialEq, Hash, Copy, Clone)]
pub enum SyncStatusType {
    Initial,
    Push,
    PullCentral,
    PullRemote,
    Integration,
}

pub trait SyncStatusTrait: Sync + Send {
    fn get_latest_sync_status(
        &self,
        ctx: &ServiceContext,
    ) -> Result<FullSyncStatus, RepositoryError> {
        get_latest_sync_status(ctx)
    }

    fn is_initialised(&self, ctx: &ServiceContext) -> Result<bool, RepositoryError> {
        is_initialised(ctx)
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

fn is_initialised(ctx: &ServiceContext) -> Result<bool, RepositoryError> {
    let done_datetime =
        SyncLogRepository::new(&ctx.connection).query_one(SyncLogFilter::new().done_datetime(
            Some(DatetimeFilter::before_or_equal_to(Utc::now().naive_utc())),
        ))?;

    if done_datetime.is_some() {
        Ok(true)
    } else {
        Ok(false)
    }
}

fn get_latest_sync_status(ctx: &ServiceContext) -> Result<FullSyncStatus, RepositoryError> {
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
    } = SyncLogRowRepository::new(&ctx.connection).load_latest_sync_log()?;

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
    Ok(result)
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
    let state = RemoteSyncState::new(&ctx.connection);

    let cursor = state.get_push_cursor().map_err(Error::DatabaseError)?;

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
