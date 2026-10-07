use async_graphql::*;

use graphql_core::{
    ContextExt,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    sync::sync_status::status::InitialisationStatus,
};

pub fn manual_sync(ctx: &Context<'_>, with_auth: bool) -> Result<String> {
    if with_auth {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::ManualSync,
                store_id: None,
                require_central_standalone: false,
            },
        )?;
    }

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let initialisation_status = service_provider
        .sync_status_service
        .get_initialisation_status(&service_context)?;

    if initialisation_status == InitialisationStatus::PreInitialisation {
        return Err(StandardGraphqlError::BadUserInput(
            "Cannot trigger sync in pre initialisation state".to_string(),
        )
        .extend());
    };

    service_provider.sync_trigger.trigger();

    Ok("Sync triggered".to_string())
}
