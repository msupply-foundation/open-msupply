pub use async_graphql::*;
use chrono::NaiveDateTime;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_status::status::FullSyncStatus,
};

use crate::sync_api_error::SyncErrorNode;

#[derive(SimpleObject)]
pub struct SyncStatusNode {
    started: NaiveDateTime,
    finished: Option<NaiveDateTime>,
}

#[derive(SimpleObject)]
pub struct SyncStatusWithProgressNode {
    started: NaiveDateTime,
    finished: Option<NaiveDateTime>,
    total_progress: Option<u32>,
    done_progress: Option<u32>,
}

#[derive(SimpleObject)]
pub struct FullSyncStatusNode {
    is_syncing: bool,
    error: Option<SyncErrorNode>,
    summary: SyncStatusNode,
    prepare_initial: Option<SyncStatusNode>,
    integration: Option<SyncStatusNode>,
    pull_central: Option<SyncStatusWithProgressNode>,
    pull_remote: Option<SyncStatusWithProgressNode>,
    push: Option<SyncStatusWithProgressNode>,
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

    let FullSyncStatus {
        is_syncing,
        error,
        summary,
        prepare_initial,
        integration,
        pull_central,
        pull_remote,
        push,
    } = sync_status;

    let result = FullSyncStatusNode {
        is_syncing,
        error: error.map(SyncErrorNode::from_sync_log_error),
        summary: SyncStatusNode {
            started: summary.started,
            finished: summary.finished,
        },
        prepare_initial: prepare_initial.map(|status| SyncStatusNode {
            started: status.started,
            finished: status.finished,
        }),
        integration: integration.map(|status| SyncStatusNode {
            started: status.started,
            finished: status.finished,
        }),
        pull_central: pull_central.map(|status| SyncStatusWithProgressNode {
            started: status.started,
            finished: status.finished,
            total_progress: status.total_progress,
            done_progress: status.done_progress,
        }),
        pull_remote: pull_remote.map(|status| SyncStatusWithProgressNode {
            started: status.started,
            finished: status.finished,
            total_progress: status.total_progress,
            done_progress: status.done_progress,
        }),
        push: push.map(|status| SyncStatusWithProgressNode {
            started: status.started,
            finished: status.finished,
            total_progress: status.total_progress,
            done_progress: status.done_progress,
        }),
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
