use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
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

    // The admin pause only applies once initialised: an initialising site must still be able
    // to trigger its first sync with the flag set.
    if matches!(initialisation_status, InitialisationStatus::Initialised(_))
        && service_provider.settings.is_sync_paused(&service_context)?
    {
        return Err(StandardGraphqlError::BadUserInput(
            "Sync is paused. A server administrator can resume it from sync settings".to_string(),
        )
        .extend());
    }

    service_provider.sync_trigger.trigger();

    Ok("Sync triggered".to_string())
}
