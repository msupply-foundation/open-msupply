use repository::{
    syncv7::SyncError, Description, FilterBuilder, RepositoryError, StorageConnection,
    SyncLogV7Row, SyncRequestCondition, SyncRequestRepository,
};

use crate::{
    i32_to_u32,
    sync::sync_status::status::{SyncStatus, SyncStatusWithProgress},
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
    /// to any sync_request row.
    pub linked_descriptions: Vec<Description>,
}

impl FullSyncStatusV7 {
    /// Single mapper. Caller supplies the linked descriptions (either fetched
    /// once when the logger started, or looked up on demand for one-shot
    /// queries via [`Self::lookup_descriptions`]).
    pub fn from_sync_log_v7_row(
        row: SyncLogV7Row,
        linked_descriptions: Vec<Description>,
    ) -> FullSyncStatusV7 {
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
            linked_descriptions,
        }
    }

    /// One-shot lookup: query sync_request rows by `reference_id` and return
    /// their descriptions. Use this on the query path (e.g. `latest_sync_status`)
    /// where there's no logger holding cached descriptions.
    pub fn lookup_descriptions(
        connection: &StorageConnection,
        reference_id: Option<&str>,
    ) -> Result<Vec<Description>, RepositoryError> {
        let Some(reference_id) = reference_id else {
            return Ok(Vec::new());
        };
        Ok(SyncRequestRepository::new(connection)
            .query(SyncRequestCondition::ReferenceId::equal(
                reference_id.to_string(),
            ))?
            .into_iter()
            .map(|r| r.description)
            .collect())
    }
}
