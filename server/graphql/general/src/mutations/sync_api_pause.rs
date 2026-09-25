use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_api_pause::{is_sync_api_paused, set_sync_api_paused, SetSyncApiPausedError},
};

/// State of central's sync API pause. Separate from `SyncPausedNode` (this server's own sync
/// client pause) so the two can grow their own fields.
#[derive(SimpleObject)]
pub struct SyncApiPausedNode {
    pub is_paused: bool,
}

/// Whether central's sync API is paused, refusing sync from remote sites. Always false on a remote.
pub fn sync_api_paused_query(ctx: &Context<'_>) -> Result<bool> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_context = ctx.service_provider().basic_context()?;
    Ok(is_sync_api_paused(&service_context.connection)?)
}

/// Pause or resume central's sync API, which remote sites sync through. Returns the new state.
pub fn set_sync_api_paused_mutation(ctx: &Context<'_>, paused: bool) -> Result<SyncApiPausedNode> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: None,
            require_central_standalone: false,
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context("".to_string(), user.user_id)?;

    let is_paused =
        set_sync_api_paused(service_provider, &service_context, paused).map_err(|error| {
            let graphql_error = match error {
                SetSyncApiPausedError::NotACentralServer => {
                    StandardGraphqlError::BadUserInput("Not a central server".to_string())
                }
                SetSyncApiPausedError::DatabaseError(error) => {
                    StandardGraphqlError::InternalError(format!("{error:?}"))
                }
            };
            graphql_error.extend()
        })?;

    Ok(SyncApiPausedNode { is_paused })
}
