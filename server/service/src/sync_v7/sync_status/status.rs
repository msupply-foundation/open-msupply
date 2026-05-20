use crate::{
    i32_to_u32,
    sync::sync_status::status::{SyncStatus, SyncStatusWithProgress},
};
use repository::{syncv7::SyncError, SyncLogV7Row};

#[derive(Debug, Clone, PartialEq)]
pub struct FullSyncStatusV7 {
    pub is_syncing: bool,
    pub error: Option<SyncError>,
    pub summary: SyncStatus,
    pub push: Option<SyncStatusWithProgress>,
    pub pull: Option<SyncStatusWithProgress>,
    pub waiting_for_integration: Option<SyncStatus>,
    pub integration: Option<SyncStatusWithProgress>,
}

impl FullSyncStatusV7 {
    pub fn from_sync_log_v7_row(row: SyncLogV7Row) -> FullSyncStatusV7 {
        let SyncLogV7Row {
            id: _,
            started_datetime,
            finished_datetime,
            push_started_datetime,
            push_finished_datetime,
            push_progress_total,
            push_progress_done,
            wait_for_integration_started_datetime,
            wait_for_integration_finished_datetime,
            pull_started_datetime,
            pull_finished_datetime,
            pull_progress_total,
            pull_progress_done,
            integration_started_datetime,
            integration_finished_datetime,
            integration_progress_total,
            integration_progress_done,
            error,
        } = row;

        FullSyncStatusV7 {
            is_syncing: finished_datetime.is_none() && error.is_none(),
            error,
            summary: SyncStatus {
                started: started_datetime,
                finished: finished_datetime,
            },
            integration: integration_started_datetime.map(|started| SyncStatusWithProgress {
                started,
                finished: integration_finished_datetime,
                total: integration_progress_total.map(i32_to_u32),
                done: integration_progress_done.map(i32_to_u32),
            }),
            waiting_for_integration: wait_for_integration_started_datetime.map(|started| {
                SyncStatus {
                    started,
                    finished: wait_for_integration_finished_datetime,
                }
            }),
            pull: pull_started_datetime.map(|started| SyncStatusWithProgress {
                started,
                finished: pull_finished_datetime,
                total: pull_progress_total.map(i32_to_u32),
                done: pull_progress_done.map(i32_to_u32),
            }),
            push: push_started_datetime.map(|started| SyncStatusWithProgress {
                started,
                finished: push_finished_datetime,
                total: push_progress_total.map(i32_to_u32),
                done: push_progress_done.map(i32_to_u32),
            }),
        }
    }
}
