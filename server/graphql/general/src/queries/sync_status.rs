pub use async_graphql::*;
use chrono::{DateTime, NaiveDateTime, Utc};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_status::status::{
        FullSyncStatus, FullSyncStatusV5V6, SyncStatus, SyncStatusWithProgress,
    },
};

use crate::sync_api_error::SyncErrorNode;
use crate::sync_v7::sync_status::FullSyncStatusV7Node;

pub struct SyncStatusNode {
    started: NaiveDateTime,
    finished: Option<NaiveDateTime>,
}

#[Object]
impl SyncStatusNode {
    async fn started(&self) -> DateTime<Utc> {
        DateTime::<Utc>::from_naive_utc_and_offset(self.started, Utc)
    }

    async fn finished(&self) -> Option<DateTime<Utc>> {
        self.finished
            .map(|v| DateTime::<Utc>::from_naive_utc_and_offset(v, Utc))
    }
}

impl SyncStatusNode {
    pub fn from_sync_status(s: SyncStatus) -> Self {
        Self {
            started: s.started,
            finished: s.finished,
        }
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
pub struct FullSyncStatusV5V6Node {
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

impl FullSyncStatusV5V6Node {
    pub fn from_sync_status(
        status: FullSyncStatusV5V6,
        last_successful_sync: Option<SyncStatus>,
    ) -> Self {
        let to_node = SyncStatusNode::from_sync_status;
        let to_progress_node = |s: SyncStatusWithProgress| SyncStatusWithProgressNode {
            started: s.started,
            finished: s.finished,
            total: s.total,
            done: s.done,
        };

        FullSyncStatusV5V6Node {
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
            last_successful_sync: last_successful_sync.map(to_node),
            warning_threshold: 1,
            error_threshold: 3,
        }
    }
}

/// Discriminated union covering both v5_v6 and v7 sync statuses.
/// The frontend dispatches on `__typename`.
#[derive(Union)]
pub enum FullSyncStatusNode {
    V5V6(FullSyncStatusV5V6Node),
    V7(FullSyncStatusV7Node),
}

pub fn latest_sync_status(
    ctx: &Context<'_>,
    with_auth: bool,
) -> Result<Option<FullSyncStatusNode>> {
    if with_auth {
        validate_sync_info_auth(ctx)?
    };

    let service_provider = ctx.service_provider();
    let basic_ctx = service_provider.basic_context()?;

    let Some(sync_status) = service_provider
        .sync_status_service
        .get_latest_sync_status(&basic_ctx)?
    else {
        return Ok(None);
    };
    let last_successful = service_provider
        .sync_status_service
        .get_latest_successful_sync_status(&basic_ctx)
        .unwrap_or(None);

    Ok(Some(match sync_status {
        FullSyncStatus::V5V6(s) => {
            FullSyncStatusNode::V5V6(FullSyncStatusV5V6Node::from_sync_status(s, last_successful))
        }
        FullSyncStatus::V7(s) => {
            FullSyncStatusNode::V7(FullSyncStatusV7Node::from_sync_status(s, last_successful))
        }
    }))
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
            require_central_standalone: false,
        },
    )?;

    Ok(())
}
