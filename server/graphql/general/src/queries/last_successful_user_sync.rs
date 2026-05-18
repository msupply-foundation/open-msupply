use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_user::SyncUser,
};

use crate::mutations::update_user::UpdateUserNode;

pub async fn last_successful_user_sync(ctx: &Context<'_>) -> Result<UpdateUserNode> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::SyncInfo,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider_data();

    let last_successful_sync = tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
        SyncUser::get_latest_successful_user_sync(&service_provider, &user.user_id)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(UpdateUserNode {
        last_successful_sync,
    })
}
