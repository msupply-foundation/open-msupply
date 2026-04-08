mod initialisation_status;
mod push_queue_count;
mod sync_status;

use actix_web::web::Data;
use async_graphql::*;
use futures::stream::Stream;
use graphql_core::standard_graphql_error::validate_auth;
use service::{
    auth::{Resource, ResourceAccessRequest},
    subscription::ResolvedSubscription,
};
use tokio::sync::broadcast;

use crate::queries::initialisation_status::InitialisationStatusNode;
use crate::queries::sync_status::FullSyncStatusNode;

use initialisation_status::initialisation_status_stream;
use push_queue_count::push_queue_count_stream;
use sync_status::sync_status_stream;

fn get_subscription_broadcast(
    ctx: &Context<'_>,
) -> Result<Data<broadcast::Sender<ResolvedSubscription>>> {
    ctx.data::<Data<broadcast::Sender<ResolvedSubscription>>>()
        .map_err(|_| Error::new("Subscription broadcast not found in context"))
        .cloned()
}

fn validate_sync_auth(ctx: &Context<'_>) -> async_graphql::Result<()> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::SyncInfo,
            store_id: None,
        },
    )?;
    Ok(())
}

// ── Operational subscriptions (authenticated) ──

#[derive(Default, Clone)]
pub struct SyncStatusSubscriptions;

#[Subscription]
impl SyncStatusSubscriptions {
    async fn sync_status_updated(
        &self,
        ctx: &Context<'_>,
    ) -> Result<impl Stream<Item = Option<FullSyncStatusNode>>> {
        validate_sync_auth(ctx)?;
        Ok(sync_status_stream(get_subscription_broadcast(ctx)?))
    }

    async fn push_queue_count_updated(
        &self,
        ctx: &Context<'_>,
    ) -> Result<impl Stream<Item = u64>> {
        validate_sync_auth(ctx)?;
        Ok(push_queue_count_stream(get_subscription_broadcast(ctx)?))
    }
}

// ── Initialisation subscriptions (no auth) ──

#[derive(Default, Clone)]
pub struct InitialisationSubscriptions;

#[Subscription]
impl InitialisationSubscriptions {
    async fn sync_status_updated(
        &self,
        ctx: &Context<'_>,
    ) -> Result<impl Stream<Item = Option<FullSyncStatusNode>>> {
        Ok(sync_status_stream(get_subscription_broadcast(ctx)?))
    }

    async fn initialisation_status_updated(
        &self,
        ctx: &Context<'_>,
    ) -> Result<impl Stream<Item = InitialisationStatusNode>> {
        Ok(initialisation_status_stream(get_subscription_broadcast(ctx)?))
    }
}
