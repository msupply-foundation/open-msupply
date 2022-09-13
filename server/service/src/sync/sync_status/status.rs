use chrono::{NaiveDateTime, Utc};
use repository::{
    ChangelogRowRepository, DatetimeFilter, RepositoryError, StorageConnection, SyncLogFilter,
    SyncLogRepository, SyncLogRow, SyncLogRowRepository,
};
use util::Defaults;

use crate::{i32_to_u32, sync::remote_data_synchroniser::RemoteSyncState};

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
        connection: &StorageConnection,
    ) -> Result<FullSyncStatus, RepositoryError> {
        get_latest_sync_status(connection)
    }
}

pub struct SyncStatusService;

impl SyncStatusTrait for SyncStatusService {}

pub fn is_initialised(connection: &StorageConnection) -> Result<bool, RepositoryError> {
    let done_datetime =
        SyncLogRepository::new(&connection).query_one(SyncLogFilter::new().done_datetime(Some(
            DatetimeFilter::before_or_equal_to(Utc::now().naive_utc()),
        )))?;

    if done_datetime.is_some() {
        Ok(true)
    } else {
        Ok(false)
    }
}

pub fn get_latest_sync_status(
    connection: &StorageConnection,
) -> Result<FullSyncStatus, RepositoryError> {
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
    } = SyncLogRowRepository::new(&connection).load_latest_sync_log()?;

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

pub fn number_of_records_in_push_queue(
    connection: &StorageConnection,
) -> Result<u32, RepositoryError> {
    let changelog = ChangelogRowRepository::new(connection);
    let state = RemoteSyncState::new(connection);

    let cursor = state.get_push_cursor()?;
    let change_logs_total = changelog.count(cursor as u64)? as u32;

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
