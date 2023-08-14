use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_user::SyncUser,
};

use crate::mutations::update_user::UpdateUserNode;

pub fn last_successful_user_sync(ctx: &Context<'_>) -> Result<UpdateUserNode> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::SyncInfo,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();

    let last_successful_sync =
        SyncUser::get_latest_successful_user_sync(service_provider, &user.user_id)?;

    Ok(UpdateUserNode {
        last_successful_sync,
    })
}
