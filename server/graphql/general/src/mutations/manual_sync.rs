use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_status::status::SyncState,
};

pub fn manual_sync(ctx: &Context<'_>, with_auth: bool) -> Result<String> {
    if with_auth {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::ManualSync,
                store_id: None,
            },
        )?;
    }

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let sync_state = service_provider
        .sync_status_service
        .get_sync_state(&service_context)?;

    if sync_state == SyncState::PreInitialisation {
        return Err(StandardGraphqlError::BadUserInput(
            "Cannot trigger sync in pre initialisation state".to_string(),
        )
        .extend());
    };

    service_provider.sync_trigger.trigger();

    Ok("Sync triggered".to_string())
}
