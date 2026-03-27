pub use async_graphql::*;
use chrono::{DateTime, NaiveDateTime, Utc};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_status::{
        status::{FullSyncStatus, SyncStatus, SyncStatusWithProgress},
        SyncLogError,
    },
};

use crate::sync_api_error::SyncErrorNode;

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

/// Refactored for the sync_status_subscription resolver:
#[derive(SimpleObject)]
pub struct FullSyncStatusNode {
    pub is_syncing: bool,
    pub error: Option<SyncErrorNode>,
    pub summary: SyncStatusNode,
    pub prepare_initial: Option<SyncStatusNode>,
    pub integration: Option<SyncStatusWithProgressNode>,
    pub pull_central: Option<SyncStatusWithProgressNode>,
    pub pull_v6: Option<SyncStatusWithProgressNode>,
    pub pull_remote: Option<SyncStatusWithProgressNode>,
    pub push: Option<SyncStatusWithProgressNode>,
    pub push_v6: Option<SyncStatusWithProgressNode>,
    pub last_successful_sync: Option<SyncStatusNode>,
    pub warning_threshold: i64,
    pub error_threshold: i64,
}

impl FullSyncStatusNode {
    pub fn from_sync_status(
        is_syncing: bool,
        error: Option<SyncLogError>,
        summary: SyncStatus,
        prepare_initial: Option<SyncStatus>,
        integration: Option<SyncStatusWithProgress>,
        pull_central: Option<SyncStatusWithProgress>,
        pull_remote: Option<SyncStatusWithProgress>,
        push: Option<SyncStatusWithProgress>,
        pull_v6: Option<SyncStatusWithProgress>,
        push_v6: Option<SyncStatusWithProgress>,
        last_successful_sync: Option<FullSyncStatus>,
    ) -> Self {
        FullSyncStatusNode {
            is_syncing,
            error: error.map(SyncErrorNode::from_sync_log_error),
            summary: SyncStatusNode {
                started: summary.started,
                duration_in_seconds: summary.duration_in_seconds,
                finished: summary.finished,
            },
            prepare_initial: prepare_initial.map(|s| SyncStatusNode {
                started: s.started,
                duration_in_seconds: s.duration_in_seconds,
                finished: s.finished,
            }),
            integration: integration.map(|s| SyncStatusWithProgressNode {
                started: s.started,
                finished: s.finished,
                total: s.total,
                done: s.done,
            }),
            pull_central: pull_central.map(|s| SyncStatusWithProgressNode {
                started: s.started,
                finished: s.finished,
                total: s.total,
                done: s.done,
            }),
            pull_remote: pull_remote.map(|s| SyncStatusWithProgressNode {
                started: s.started,
                finished: s.finished,
                total: s.total,
                done: s.done,
            }),
            push: push.map(|s| SyncStatusWithProgressNode {
                started: s.started,
                finished: s.finished,
                total: s.total,
                done: s.done,
            }),
            pull_v6: pull_v6.map(|s| SyncStatusWithProgressNode {
                started: s.started,
                finished: s.finished,
                total: s.total,
                done: s.done,
            }),
            push_v6: push_v6.map(|s| SyncStatusWithProgressNode {
                started: s.started,
                finished: s.finished,
                total: s.total,
                done: s.done,
            }),
            last_successful_sync: last_successful_sync.map(|status| SyncStatusNode {
                started: status.summary.started,
                duration_in_seconds: status.summary.duration_in_seconds,
                finished: status.summary.finished,
            }),
            warning_threshold: 1,
            error_threshold: 3,
        }
    }
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

    let FullSyncStatus {
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
    } = sync_status;

    Ok(Some(FullSyncStatusNode::from_sync_status(
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
        last_successful_sync_status,
    )))
}

pub fn number_of_records_in_push_queue(ctx: &Context<'_>) -> Result<u64> {
    validate_sync_info_auth(ctx)?;

    let service_provider = ctx.service_provider();
    let ctx = service_provider.basic_context()?;
    let push_queue_count = service_provider
        .sync_status_service
        .number_of_records_in_push_queue(&ctx)
        .map_err(|error| {
            let formatted_error = format!("{error:#?}");
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
