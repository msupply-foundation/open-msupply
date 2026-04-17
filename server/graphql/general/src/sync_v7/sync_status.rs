use async_graphql::*;
use chrono::{DateTime, NaiveDateTime, Utc};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_status::status::{SyncStatus, SyncStatusWithProgress},
    sync_v7::sync_status::status::FullSyncStatusV7,
};

use super::sync_api_error::SyncErrorV7Node;

pub struct SyncStatusV7Node {
    started: NaiveDateTime,
    duration_in_seconds: i32,
    finished: Option<NaiveDateTime>,
}

#[Object]
impl SyncStatusV7Node {
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

pub struct SyncStatusWithProgressV7Node {
    started: NaiveDateTime,
    finished: Option<NaiveDateTime>,
    total: Option<u32>,
    done: Option<u32>,
}

#[Object]
impl SyncStatusWithProgressV7Node {
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
pub struct FullSyncStatusV7Node {
    is_syncing: bool,
    error: Option<SyncErrorV7Node>,
    summary: SyncStatusV7Node,
    push: Option<SyncStatusWithProgressV7Node>,
    pull: Option<SyncStatusWithProgressV7Node>,
    waiting_for_integration: Option<SyncStatusV7Node>,
    integration: Option<SyncStatusWithProgressV7Node>,
    last_successful_sync: Option<SyncStatusV7Node>,
    warning_threshold: i64,
    error_threshold: i64,
}

impl FullSyncStatusV7Node {
    pub fn from_sync_status(
        status: FullSyncStatusV7,
        last_successful_sync: Option<FullSyncStatusV7>,
    ) -> Self {
        let to_node = |s: SyncStatus| SyncStatusV7Node {
            started: s.started,
            duration_in_seconds: s.duration_in_seconds,
            finished: s.finished,
        };
        let to_progress_node = |s: SyncStatusWithProgress| SyncStatusWithProgressV7Node {
            started: s.started,
            finished: s.finished,
            total: s.total,
            done: s.done,
        };

        FullSyncStatusV7Node {
            is_syncing: status.is_syncing,
            error: status.error.map(SyncErrorV7Node::from_sync_error),
            summary: to_node(status.summary),
            push: status.push.map(&to_progress_node),
            pull: status.pull.map(&to_progress_node),
            waiting_for_integration: status.waiting_for_integration.map(&to_node),
            integration: status.integration.map(to_progress_node),
            last_successful_sync: last_successful_sync.map(|s| to_node(s.summary)),
            warning_threshold: 1,
            error_threshold: 3,
        }
    }
}

pub fn latest_sync_status_v7(
    ctx: &Context<'_>,
    with_auth: bool,
) -> Result<Option<FullSyncStatusV7Node>> {
    if with_auth {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::SyncInfo,
                store_id: None,
            },
        )?;
    }

    let service_provider = ctx.service_provider();
    let ctx = service_provider.basic_context()?;
    let sync_status = match service_provider
        .sync_status_v7_service
        .get_latest_sync_status_v7(&ctx)?
    {
        Some(sync_status) => sync_status,
        None => return Ok(None),
    };
    let last_successful_sync_status = service_provider
        .sync_status_v7_service
        .get_latest_successful_sync_status_v7(&ctx)
        .map_err(|error| {
            let formatted_error = format!("{error:#?}");
            StandardGraphqlError::InternalError(formatted_error).extend()
        })
        .unwrap_or(None);

    Ok(Some(FullSyncStatusV7Node::from_sync_status(
        sync_status,
        last_successful_sync_status,
    )))
}
