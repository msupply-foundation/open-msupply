use chrono::Utc;
use repository::{
    sync_log_v7::Condition, syncv7::SyncError, FilterBuilder, RepositoryError,
    SyncLogV7Repository, SyncLogV7Row,
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
                duration_in_seconds: finished_datetime
                    .unwrap_or_else(|| Utc::now().naive_utc())
                    .signed_duration_since(started_datetime)
                    .num_seconds() as i32,
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
                    duration_in_seconds: wait_for_integration_finished_datetime
                        .unwrap_or_else(|| Utc::now().naive_utc())
                        .signed_duration_since(started)
                        .num_seconds() as i32,
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

pub trait SyncStatusV7Trait: Sync + Send {
    fn get_latest_sync_status_v7(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Option<FullSyncStatusV7>, RepositoryError> {
        get_latest_sync_status_v7(ctx)
    }

    fn get_latest_successful_sync_status_v7(
        &self,
        ctx: &ServiceContext,
    ) -> Result<Option<FullSyncStatusV7>, RepositoryError> {
        get_latest_successful_sync_status_v7(ctx)
    }

    fn get_initialisation_status_v7(
        &self,
        ctx: &ServiceContext,
    ) -> Result<InitialisationStatus, RepositoryError> {
        get_initialisation_status_v7(ctx)
    }
}

pub(crate) struct SyncStatusV7Service;

impl SyncStatusV7Trait for SyncStatusV7Service {}

fn get_latest_sync_status_v7(
    ctx: &ServiceContext,
) -> Result<Option<FullSyncStatusV7>, RepositoryError> {
    let row = SyncLogV7Repository::new(&ctx.connection).query_one(Condition::TRUE)?;
    Ok(row.map(FullSyncStatusV7::from_sync_log_v7_row))
}

fn get_latest_successful_sync_status_v7(
    ctx: &ServiceContext,
) -> Result<Option<FullSyncStatusV7>, RepositoryError> {
    let row = SyncLogV7Repository::new(&ctx.connection).query_one(Condition::And(vec![
        Condition::FinishedDatetime::is_not_null(),
        Condition::Error::is_null(),
    ]))?;
    Ok(row.map(FullSyncStatusV7::from_sync_log_v7_row))
}

fn get_initialisation_status_v7(
    ctx: &ServiceContext,
) -> Result<InitialisationStatus, RepositoryError> {
    let filter = Condition::And(vec![
        Condition::FinishedDatetime::is_not_null(),
        Condition::Error::is_null(),
    ]);

    match SyncLogV7Repository::new(&ctx.connection).query_one(filter)? {
        Some(_) => {
            let site_name = SettingsService.sync_settings(ctx)?.unwrap().username;
            Ok(InitialisationStatus::Initialised(site_name))
        }
        None => Ok(InitialisationStatus::PreInitialisation),
    }
}
