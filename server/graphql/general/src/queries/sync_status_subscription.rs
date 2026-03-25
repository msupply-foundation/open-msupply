use actix_web::web::Data;
use async_graphql::*;
use futures::stream::{self, Stream};
use graphql_core::standard_graphql_error::validate_auth;
use service::{
    auth::{Resource, ResourceAccessRequest},
    service_provider::ServiceProvider,
    sync::sync_status::status::FullSyncStatus,
};
use tokio::sync::broadcast;

use super::sync_status::FullSyncStatusNode;

#[derive(Default, Clone)]
pub struct SyncStatusSubscriptions;

#[Subscription]
impl SyncStatusSubscriptions {
    /// Subscribe to real-time sync status updates.
    /// Emits a new value whenever the sync status changes (phase start/complete, progress, error).
    async fn sync_status_updated(
        &self,
        ctx: &Context<'_>,
    ) -> Result<impl Stream<Item = Option<FullSyncStatusNode>>> {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::SyncInfo,
                store_id: None,
            },
        )?;

        let service_provider: Data<ServiceProvider> =
            ctx.data_unchecked::<Data<ServiceProvider>>().clone();
        let receiver = service_provider.sync_status_notify.subscribe();

        Ok(stream::unfold(
            (receiver, service_provider),
            |(mut rx, sp)| async move {
                loop {
                    match rx.recv().await {
                        Ok(_) => {
                            let result = query_sync_status(&sp);
                            return Some((result, (rx, sp)));
                        }
                        Err(broadcast::error::RecvError::Lagged(_)) => {
                            // Missed some messages, just get the latest status
                            let result = query_sync_status(&sp);
                            return Some((result, (rx, sp)));
                        }
                        Err(broadcast::error::RecvError::Closed) => {
                            return None;
                        }
                    }
                }
            },
        ))
    }
}

fn query_sync_status(service_provider: &ServiceProvider) -> Option<FullSyncStatusNode> {
    let ctx = match service_provider.basic_context() {
        Ok(ctx) => ctx,
        Err(_) => return None,
    };

    let sync_status = match service_provider
        .sync_status_service
        .get_latest_sync_status(&ctx)
    {
        Ok(Some(status)) => status,
        _ => return None,
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

    Some(FullSyncStatusNode::from_sync_status(
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
    ))
}
