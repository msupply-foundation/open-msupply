pub use async_graphql::*;
use chrono::NaiveDateTime;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};

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
    error: Option<String>,
    summary: SyncStatusNode,
    prepare_initial: Option<SyncStatusNode>,
    integration: Option<SyncStatusNode>,
    pull_central: Option<SyncStatusWithProgressNode>,
    pull_remote: Option<SyncStatusWithProgressNode>,
    push: Option<SyncStatusWithProgressNode>,
}

#[derive(Default, Clone)]
pub struct SyncInfoQueries;

#[Object]
impl SyncInfoQueries {
    pub async fn is_initialised(&self, ctx: &Context<'_>) -> Result<bool> {
        let service_provider = ctx.service_provider();
        let ctx = service_provider.context()?;
        let is_initialised = service_provider.sync_status_service.is_initialised(&ctx)?;

        Ok(is_initialised)
    }

    pub async fn latest_sync_status(&self, ctx: &Context<'_>) -> Result<FullSyncStatusNode> {
        let service_provider = ctx.service_provider();
        let ctx = service_provider.context()?;
        let sync_status = service_provider
            .sync_status_service
            .get_latest_sync_status(&ctx)?;

        Ok(FullSyncStatusNode {
            is_syncing: sync_status.is_syncing,
            error: sync_status.error,
            summary: SyncStatusNode {
                started: sync_status.summary.started,
                finished: sync_status.summary.finished,
            },
            prepare_initial: sync_status.prepare_initial.map(|status| SyncStatusNode {
                started: status.started,
                finished: status.finished,
            }),
            integration: sync_status.integration.map(|status| SyncStatusNode {
                started: status.started,
                finished: status.finished,
            }),
            pull_central: sync_status
                .pull_central
                .map(|status| SyncStatusWithProgressNode {
                    started: status.started,
                    finished: status.finished,
                    total_progress: status.total_progress,
                    done_progress: status.done_progress,
                }),
            pull_remote: sync_status
                .pull_remote
                .map(|status| SyncStatusWithProgressNode {
                    started: status.started,
                    finished: status.finished,
                    total_progress: status.total_progress,
                    done_progress: status.done_progress,
                }),
            push: sync_status.push.map(|status| SyncStatusWithProgressNode {
                started: status.started,
                finished: status.finished,
                total_progress: status.total_progress,
                done_progress: status.done_progress,
            }),
        })
    }

    pub async fn number_of_records_in_push_queue(&self, ctx: &Context<'_>) -> Result<u64> {
        let service_provider = ctx.service_provider();
        let ctx = service_provider.context()?;
        let push_queue_count = service_provider
            .sync_status_service
            .number_of_records_in_push_queue(&ctx)
            .map_err(|error| {
                let formatted_error = format!("{:#?}", error);
                StandardGraphqlError::InternalError(formatted_error).extend()
            })?;

        Ok(push_queue_count)
    }
}
