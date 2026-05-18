mod initialisation_status;
mod sync_info;

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

use initialisation_status::initialisation_status_stream;
use sync_info::{sync_info_stream, SyncInfoUpdatedNode};

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
    async fn sync_info_updated(
        &self,
        ctx: &Context<'_>,
    ) -> Result<impl Stream<Item = SyncInfoUpdatedNode>> {
        validate_sync_auth(ctx)?;
        Ok(sync_info_stream(get_subscription_broadcast(ctx)?))
    }

    async fn initialisation_status_updated(
        &self,
        ctx: &Context<'_>,
    ) -> Result<impl Stream<Item = InitialisationStatusNode>> {
        validate_sync_auth(ctx)?;
        Ok(initialisation_status_stream(get_subscription_broadcast(ctx)?))
    }
}

// ── Initialisation subscriptions (no auth) ──

#[derive(Default, Clone)]
pub struct InitialisationSubscriptions;

#[Subscription]
impl InitialisationSubscriptions {
    async fn sync_info_updated(
        &self,
        ctx: &Context<'_>,
    ) -> Result<impl Stream<Item = SyncInfoUpdatedNode>> {
        Ok(sync_info_stream(get_subscription_broadcast(ctx)?))
    }

    async fn initialisation_status_updated(
        &self,
        ctx: &Context<'_>,
    ) -> Result<impl Stream<Item = InitialisationStatusNode>> {
        Ok(initialisation_status_stream(get_subscription_broadcast(ctx)?))
    }
}
