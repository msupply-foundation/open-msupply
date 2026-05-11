use chrono::Utc;
use repository::{
    syncv7::SyncError, FilterBuilder, RepositoryError, SyncLogV7Condition, SyncLogV7Repository,
    SyncLogV7Row, SyncRequestCondition, SyncRequestRepository, StorageConnection,
};

use crate::{
    i32_to_u32,
    service_provider::ServiceContext,
    settings_service::{SettingsService, SettingsServiceTrait},
    sync::sync_status::status::{InitialisationStatus, SyncStatus, SyncStatusWithProgress},
};

#[derive(Debug, Clone, PartialEq)]
pub struct FullSyncStatusV7 {
    pub is_syncing: bool,
    pub error: Option<SyncError>,
    pub summary: SyncStatus,
    pub push: Option<SyncStatusWithProgress>,
    pub pull: Option<SyncStatusWithProgress>,
    pub waiting_for_integration: Option<SyncStatus>,
    pub integration: Option<SyncStatusWithProgress>,
    /// Descriptions of every sync_request whose `reference_id` matches this
    /// sync_log_v7 row's `reference_id`. Empty for the main sync
    /// (reference_id NULL) and for runs whose reference_id no longer links
    /// to any process row.
    pub linked_descriptions: Vec<String>,
}

impl FullSyncStatusV7 {
    /// Looks up linked sync_request rows by `reference_id` and includes their
    /// descriptions. Use `from_sync_log_v7_row` when descriptions aren't
    /// needed (e.g. summary-only callsites).
    pub fn from_sync_log_v7_row_with_links(
        connection: &StorageConnection,
        row: SyncLogV7Row,
    ) -> Result<FullSyncStatusV7, RepositoryError> {
        let linked_descriptions = match row.reference_id.as_deref() {
            Some(reference_id) => SyncRequestRepository::new(connection)
                .query(SyncRequestCondition::ReferenceId::equal(reference_id.to_string()))?
                .into_iter()
                .map(|r| r.description)
                .collect(),
            None => Vec::new(),
        };
        let mut status = Self::from_sync_log_v7_row(row);
        status.linked_descriptions = linked_descriptions;
        Ok(status)
    }

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
            reference_id: _,
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
            linked_descriptions: Vec::new(),
        }
    }
}

