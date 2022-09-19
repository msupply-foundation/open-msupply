use chrono::{NaiveDateTime, Utc};
use repository::{
    ChangelogRepository, DatetimeFilter, RepositoryError, StorageConnection, SyncLogFilter,
    SyncLogRepository, SyncLogRow, SyncLogRowRepository,
};

use crate::{i32_to_u32, sync::GetActiveStoresOnSiteError};

use super::{get_active_records_on_site_filter, remote_data_synchroniser::RemoteSyncState};

#[derive(Debug)]
pub struct SyncStatus {
    pub started: NaiveDateTime,
    pub finished: Option<NaiveDateTime>,
}

#[derive(Debug)]
pub struct SyncStatusWithProgress {
    pub started: NaiveDateTime,
    pub finished: Option<NaiveDateTime>,
    pub total_progress: u32,
    pub done_progress: u32,
}

#[derive(Debug)]
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

pub trait SiteInfoQueriesTrait: Sync + Send {
    fn get_latest_sync_status(
        &self,
        connection: &StorageConnection,
    ) -> Result<FullSyncStatus, RepositoryError> {
        get_latest_sync_status(connection)
    }
}

pub struct SiteInfoQueriesService {}

impl SiteInfoQueriesTrait for SiteInfoQueriesService {}

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
        push_progress_start,
        push_progress_done,
        pull_central_start_datetime,
        pull_central_done_datetime,
        pull_central_progress_start,
        pull_central_progress_done,
        pull_remote_start_datetime,
        pull_remote_done_datetime,
        pull_remote_progress_start,
        pull_remote_progress_done,
        integration_start_datetime,
        integration_done_datetime,
        error_message,
    } = SyncLogRowRepository::new(&connection).load_latest_sync_log()?;

    let result = FullSyncStatus {
        is_syncing: done_datetime.is_some() || error_message.is_some(),
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
            total_progress: pull_central_progress_start.map(i32_to_u32).unwrap_or(0),
            done_progress: pull_central_progress_done.unwrap_or(0) as u32,
        }),
        pull_remote: pull_remote_start_datetime.map(|started| SyncStatusWithProgress {
            started,
            finished: pull_remote_done_datetime,
            total_progress: pull_remote_progress_start.map(i32_to_u32).unwrap_or(0),
            done_progress: pull_remote_progress_done.unwrap_or(0) as u32,
        }),
        push: push_start_datetime.map(|started| SyncStatusWithProgress {
            started,
            finished: push_done_datetime,
            total_progress: push_progress_start.map(i32_to_u32).unwrap_or(0),
            done_progress: push_progress_done.unwrap_or(0) as u32,
        }),
    };
    Ok(result)
}

#[derive(Debug)]
pub enum NumberOfRecordsInPushQueueError {
    DatabaseError(RepositoryError),
    SiteIdNotSet,
}

pub fn number_of_records_in_push_queue(
    connection: &StorageConnection,
) -> Result<u64, NumberOfRecordsInPushQueueError> {
    use NumberOfRecordsInPushQueueError as Error;
    let changelog = ChangelogRepository::new(connection);
    let state = RemoteSyncState::new(connection);

    let cursor = state.get_push_cursor().map_err(Error::DatabaseError)?;

    let changelog_filter =
        get_active_records_on_site_filter(&connection).map_err(|error| match error {
            GetActiveStoresOnSiteError::DatabaseError(error) => Error::DatabaseError(error),
            GetActiveStoresOnSiteError::SiteIdNotSet => Error::SiteIdNotSet,
        })?;

    let change_logs_total = changelog
        .count(cursor, changelog_filter)
        .map_err(Error::DatabaseError)?;

    Ok(change_logs_total)
}
