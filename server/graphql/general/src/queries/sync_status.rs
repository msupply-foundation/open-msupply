pub use async_graphql::*;
use chrono::NaiveDateTime;
use graphql_core::ContextExt;
use service::sync::sync_status::{is_initialised, number_of_records_in_push_queue};

#[derive(SimpleObject)]
pub struct SyncStatusNode {
    started: NaiveDateTime,
    finished: Option<NaiveDateTime>,
}

#[derive(SimpleObject)]
pub struct SyncStatusWithProgressNode {
    started: NaiveDateTime,
    finished: Option<NaiveDateTime>,
    total_progress: u32,
    done_progress: u32,
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
        let connection = ctx.service_provider().connection()?;
        let is_initialised = is_initialised(&connection)?;

        Ok(is_initialised)
    }

    pub async fn latest_sync_status(&self, ctx: &Context<'_>) -> Result<FullSyncStatusNode> {
        let service_provider = ctx.service_provider();
        let connection = service_provider.connection()?;
        let sync_status = service_provider
            .site_info_queries_service
            .get_latest_sync_status(&connection)?;

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

    pub async fn number_of_records_in_push_queue(&self, ctx: &Context<'_>) -> Result<u32> {
        let connection = ctx.service_provider().connection()?;
        let push_queue_count = number_of_records_in_push_queue(&connection)?;

        Ok(push_queue_count)
    }
}
