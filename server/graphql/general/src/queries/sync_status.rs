pub use async_graphql::*;
use chrono::{DateTime, NaiveDateTime, Utc};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use repository::SyncLogV7Row;
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_status::status::{FullSyncStatus, SyncStatusVariant},
};

use crate::sync_api_error::SyncErrorNode;

#[derive(Default)]
pub struct SyncStatusNode {
    started: NaiveDateTime,
    duration_in_seconds: i32,
    finished: Option<NaiveDateTime>,
}

#[Object]
impl SyncStatusNode {
    async fn started(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.started, Utc)
    }

    async fn duration_in_seconds(&self) -> i32 {
        self.duration_in_seconds
    }

    async fn finished(&self) -> Option<DateTime<Utc>> {
        self.finished
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }
}

pub struct SyncStatusWithProgressNode {
    started: NaiveDateTime,
    finished: Option<NaiveDateTime>,
    total: Option<u32>,
    done: Option<u32>,
}

#[Object]
impl SyncStatusWithProgressNode {
    async fn started(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.started, Utc)
    }

    async fn finished(&self) -> Option<DateTime<Utc>> {
        self.finished
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }

    async fn total(&self) -> &Option<u32> {
        &self.total
    }

    async fn done(&self) -> &Option<u32> {
        &self.done
    }
}

// #[derive(Union)]
// pub enum SyncStatusUnion {
//     Original(FullSyncStatusNode),
//     V7(FullSyncStatusNodeV7),
// }

// #[derive(SimpleObject)]
// pub struct FullSyncStatusNodeV7 {
//     row: serde_json::Value,
// }

#[derive(SimpleObject, Default)]
pub struct FullSyncStatusNode {
    is_syncing: bool,
    error: Option<SyncErrorNode>,
    summary: SyncStatusNode,
    prepare_initial: Option<SyncStatusNode>,
    integration: Option<SyncStatusWithProgressNode>,
    waiting_for_integration: Option<SyncStatusNode>,
    pull_central: Option<SyncStatusWithProgressNode>,
    pull_v6: Option<SyncStatusWithProgressNode>,
    pull: Option<SyncStatusWithProgressNode>,
    pull_remote: Option<SyncStatusWithProgressNode>,
    push: Option<SyncStatusWithProgressNode>,
    push_v6: Option<SyncStatusWithProgressNode>,
    last_successful_sync: Option<SyncStatusNode>,
    warning_threshold: i64,
    error_threshold: i64,
}

pub fn latest_sync_status(
    ctx: &Context<'_>,
    with_auth: bool,
) -> Result<Option<FullSyncStatusNode>> {
    if with_auth {
        validate_sync_info_auth(ctx)?
    };

    let service_provider = ctx.service_provider();
    let ctx = service_provider.basic_context()?;
    let sync_status = match service_provider
        .sync_status_service
        .get_latest_sync_status(&ctx)?
    {
        Some(sync_status) => sync_status,
        None => return Ok(None),
    };
    let last_successful_sync_status = service_provider
        .sync_status_service
        .get_latest_successful_sync_status(&ctx)
        .unwrap_or(None);

    let result = match sync_status {
        SyncStatusVariant::Original(FullSyncStatus {
            is_syncing,
            error,
            summary,
            prepare_initial,
            integration,
            pull_central,
            pull_remote,
            push,
            pull_v6,
            push_v6,
        }) => {
            let last_successful_sync_status = match last_successful_sync_status {
                Some(SyncStatusVariant::Original(status)) => Some(status),
                _ => None,
            };

            FullSyncStatusNode {
                is_syncing,
                error: error.map(SyncErrorNode::from_sync_log_error),
                summary: SyncStatusNode {
                    started: summary.started,
                    duration_in_seconds: summary.duration_in_seconds,
                    finished: summary.finished,
                },
                prepare_initial: prepare_initial.map(|status| SyncStatusNode {
                    started: status.started,
                    duration_in_seconds: status.duration_in_seconds,
                    finished: status.finished,
                }),
                integration: integration.map(|status| SyncStatusWithProgressNode {
                    started: status.started,
                    finished: status.finished,
                    total: status.total,
                    done: status.done,
                }),
                pull_central: pull_central.map(|status| SyncStatusWithProgressNode {
                    started: status.started,
                    finished: status.finished,
                    total: status.total,
                    done: status.done,
                }),
                pull_remote: pull_remote.map(|status| SyncStatusWithProgressNode {
                    started: status.started,
                    finished: status.finished,
                    total: status.total,
                    done: status.done,
                }),
                push: push.map(|status| SyncStatusWithProgressNode {
                    started: status.started,
                    finished: status.finished,
                    total: status.total,
                    done: status.done,
                }),
                last_successful_sync: last_successful_sync_status.map(
                    |last_successful_sync_status| SyncStatusNode {
                        started: last_successful_sync_status.summary.started,
                        duration_in_seconds: last_successful_sync_status
                            .summary
                            .duration_in_seconds,
                        finished: last_successful_sync_status.summary.finished,
                    },
                ),
                pull_v6: pull_v6.map(|status| SyncStatusWithProgressNode {
                    started: status.started,
                    finished: status.finished,
                    total: status.total,
                    done: status.done,
                }),
                push_v6: push_v6.map(|status| SyncStatusWithProgressNode {
                    started: status.started,
                    finished: status.finished,
                    total: status.total,
                    done: status.done,
                }),
                warning_threshold: 1, // constant for now, may be some sort of pref later
                error_threshold: 3,
                ..Default::default()
            }
        }
        SyncStatusVariant::V7(SyncLogV7Row {
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
        }) => {
            let last_successful_sync_status = match last_successful_sync_status {
                Some(SyncStatusVariant::V7(status)) => Some(status),
                _ => None,
            };

            FullSyncStatusNode {
                is_syncing: finished_datetime.is_none(),
                error: error.map(SyncErrorNode::from_sync_log_error_v7),
                summary: SyncStatusNode {
                    started: started_datetime,
                    duration_in_seconds: finished_datetime
                        .unwrap_or_else(|| Utc::now().naive_utc())
                        .signed_duration_since(started_datetime)
                        .num_seconds() as i32,
                    finished: finished_datetime,
                },
                integration: integration_started_datetime.map(|started| {
                    SyncStatusWithProgressNode {
                        started: started,
                        finished: integration_finished_datetime,
                        total: integration_progress_total.map(|v| v as u32),
                        done: integration_progress_done.map(|v| v as u32),
                    }
                }),
                push: push_started_datetime.map(|started| SyncStatusWithProgressNode {
                    started: started,
                    finished: push_finished_datetime,
                    total: push_progress_total.map(|v| v as u32),
                    done: push_progress_done.map(|v| v as u32),
                }),
                pull: pull_started_datetime.map(|started| SyncStatusWithProgressNode {
                    started: started,
                    finished: pull_finished_datetime,
                    total: pull_progress_total.map(|v| v as u32),
                    done: pull_progress_done.map(|v| v as u32),
                }),
                waiting_for_integration: wait_for_integration_started_datetime.map(|started| {
                    SyncStatusNode {
                        started,
                        duration_in_seconds: wait_for_integration_finished_datetime
                            .unwrap_or_else(|| Utc::now().naive_utc())
                            .signed_duration_since(started)
                            .num_seconds() as i32,
                        finished: wait_for_integration_finished_datetime,
                    }
                }),
                last_successful_sync: last_successful_sync_status.map(|status| SyncStatusNode {
                    started: status.started_datetime,
                    duration_in_seconds: status
                        .finished_datetime
                        .unwrap_or_else(|| Utc::now().naive_utc())
                        .signed_duration_since(status.started_datetime)
                        .num_seconds() as i32,
                    finished: status.finished_datetime,
                }),
                warning_threshold: 1, // constant for now, may be some sort of pref later
                error_threshold: 3,
                ..Default::default()
            }
        }
    };

    Ok(Some(result))
}

pub fn number_of_records_in_push_queue(ctx: &Context<'_>) -> Result<u64> {
    validate_sync_info_auth(ctx)?;

    let service_provider = ctx.service_provider();
    let ctx = service_provider.basic_context()?;
    let push_queue_count = service_provider
        .sync_status_service
        .number_of_records_in_push_queue(&ctx)
        .map_err(|error| {
            let formatted_error = format!("{:#?}", error);
            StandardGraphqlError::InternalError(formatted_error).extend()
        })?;

    Ok(push_queue_count)
}

fn validate_sync_info_auth(ctx: &Context<'_>) -> Result<()> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::SyncInfo,
            store_id: None,
        },
    )?;

    Ok(())
}
