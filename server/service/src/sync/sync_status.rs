use std::collections::HashMap;

use chrono::{NaiveDateTime, Utc};
use repository::{
    DatetimeFilter, RepositoryError, StorageConnection, SyncLogFilter, SyncLogRepository,
    SyncLogRowRepository,
};
use util::Defaults;

#[derive(Debug)]
pub struct SyncStatus {
    pub started: Option<NaiveDateTime>,
    pub finished: Option<NaiveDateTime>,
}

#[derive(Debug)]
pub struct SyncStatusWithProgress {
    pub started: Option<NaiveDateTime>,
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

pub fn is_initialised(connection: &StorageConnection) -> Result<bool, RepositoryError> {
    match SyncLogRepository::new(&connection).query_by_filter(
        SyncLogFilter::new().prepare_initial_done_datetime(Some(
            DatetimeFilter::before_or_equal_to(Utc::now().naive_utc()),
        )),
    ) {
        Ok(sync_log) => {
            let mut is_initialised = false;
            for log in sync_log {
                if log.sync_log_row.prepare_initial_done_datetime.is_some() {
                    is_initialised = true;
                }
            }
            Ok(is_initialised)
        }
        Err(e) => Err(e),
    }
}

pub fn get_latest_sync_status(
    connection: &StorageConnection,
) -> Result<FullSyncStatus, RepositoryError> {
    use crate::sync::sync_status::SyncStatusType::*;

    let most_recent_sync_row = SyncLogRowRepository::new(&connection).load_latest_sync_log()?;

    let mut sync_map = HashMap::new();
    sync_map.insert(
        Initial,
        SyncStatus {
            started: most_recent_sync_row.prepare_initial_start_datetime,
            finished: most_recent_sync_row.prepare_initial_done_datetime,
        },
    );
    sync_map.insert(
        Push,
        SyncStatus {
            started: most_recent_sync_row.push_start_datetime,
            finished: most_recent_sync_row.push_done_datetime,
        },
    );
    sync_map.insert(
        PullCentral,
        SyncStatus {
            started: most_recent_sync_row.pull_central_start_datetime,
            finished: most_recent_sync_row.pull_central_done_datetime,
        },
    );
    sync_map.insert(
        PullRemote,
        SyncStatus {
            started: most_recent_sync_row.pull_remote_start_datetime,
            finished: most_recent_sync_row.pull_remote_done_datetime,
        },
    );
    sync_map.insert(
        Integration,
        SyncStatus {
            started: most_recent_sync_row.integration_start_datetime,
            finished: most_recent_sync_row.integration_done_datetime,
        },
    );

    let mut max_key = Initial;
    let mut max_datetime = most_recent_sync_row
        .prepare_initial_start_datetime
        .unwrap_or(Defaults::naive_date_time());
    for (key, sync_status) in sync_map {
        if let Some(started) = sync_status.started {
            if started > max_datetime {
                max_key = key;
                max_datetime = started;
            }
        }
        if let Some(finished) = sync_status.finished {
            if finished > max_datetime {
                max_key = key;
                max_datetime = finished;
            }
        }
    }

    let mut sync_status = FullSyncStatus {
        is_syncing: false,
        error: most_recent_sync_row.error_message,
        summary: SyncStatus {
            started: Some(most_recent_sync_row.started_datetime),
            finished: most_recent_sync_row.done_endtime,
        },
        prepare_initial: None,
        integration: None,
        pull_central: None,
        pull_remote: None,
        push: None,
    };

    match max_key {
        Initial => {
            sync_status.prepare_initial = Some(SyncStatus {
                started: most_recent_sync_row.prepare_initial_start_datetime,
                finished: most_recent_sync_row.prepare_initial_done_datetime,
            });
        }
        Push => {
            sync_status.push = Some(SyncStatusWithProgress {
                started: most_recent_sync_row.push_start_datetime,
                finished: most_recent_sync_row.push_done_datetime,
                total_progress: most_recent_sync_row.push_progress_start.unwrap_or_default() as u32,
                done_progress: most_recent_sync_row.push_progress_done.unwrap_or_default() as u32,
            });
        }
        PullCentral => {
            sync_status.pull_central = Some(SyncStatusWithProgress {
                started: most_recent_sync_row.pull_central_start_datetime,
                finished: most_recent_sync_row.pull_central_done_datetime,
                total_progress: most_recent_sync_row
                    .pull_central_progress_start
                    .unwrap_or_default() as u32,
                done_progress: most_recent_sync_row
                    .pull_central_progress_done
                    .unwrap_or_default() as u32,
            });
        }
        PullRemote => {
            sync_status.pull_remote = Some(SyncStatusWithProgress {
                started: most_recent_sync_row.pull_remote_start_datetime,
                finished: most_recent_sync_row.pull_remote_done_datetime,
                total_progress: most_recent_sync_row
                    .pull_remote_progress_start
                    .unwrap_or_default() as u32,
                done_progress: most_recent_sync_row
                    .pull_remote_progress_done
                    .unwrap_or_default() as u32,
            });
        }
        Integration => {
            sync_status.integration = Some(SyncStatus {
                started: most_recent_sync_row.integration_start_datetime,
                finished: most_recent_sync_row.integration_done_datetime,
            });
        }
    }

    Ok(sync_status)
}

pub fn number_of_records_in_push_queue(
    connection: &StorageConnection,
) -> Result<u32, RepositoryError> {
    let most_recent_sync_row = SyncLogRowRepository::new(&connection).load_latest_sync_log()?;

    Ok(most_recent_sync_row.push_progress_start.unwrap_or_default() as u32)
}
