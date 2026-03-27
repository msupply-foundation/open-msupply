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

#[derive(SimpleObject)]
pub struct FullSyncStatusNode {
    is_syncing: bool,
    error: Option<SyncErrorNode>,
    summary: SyncStatusNode,
    prepare_initial: Option<SyncStatusNode>,
    integration: Option<SyncStatusWithProgressNode>,
    pull_central: Option<SyncStatusWithProgressNode>,
    pull_v6: Option<SyncStatusWithProgressNode>,
    pull_remote: Option<SyncStatusWithProgressNode>,
    push: Option<SyncStatusWithProgressNode>,
    push_v6: Option<SyncStatusWithProgressNode>,
    last_successful_sync: Option<SyncStatusNode>,
    warning_threshold: i64,
    error_threshold: i64,
}

impl FullSyncStatusNode {
    pub fn from_sync_status(
        status: FullSyncStatus,
        last_successful_sync: Option<FullSyncStatus>,
    ) -> Self {
        let to_node = |s: SyncStatus| SyncStatusNode {
            started: s.started,
            duration_in_seconds: s.duration_in_seconds,
            finished: s.finished,
        };
        let to_progress_node = |s: SyncStatusWithProgress| SyncStatusWithProgressNode {
            started: s.started,
            finished: s.finished,
            total: s.total,
            done: s.done,
        };

        FullSyncStatusNode {
            is_syncing: status.is_syncing,
            error: status.error.map(SyncErrorNode::from_sync_log_error),
            summary: to_node(status.summary),
            prepare_initial: status.prepare_initial.map(to_node),
            integration: status.integration.map(to_progress_node),
            pull_central: status.pull_central.map(to_progress_node),
            pull_remote: status.pull_remote.map(to_progress_node),
            push: status.push.map(to_progress_node),
            pull_v6: status.pull_v6.map(to_progress_node),
            push_v6: status.push_v6.map(to_progress_node),
            last_successful_sync: last_successful_sync.map(|s| to_node(s.summary)),
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

    Ok(Some(FullSyncStatusNode::from_sync_status(
        sync_status,
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
