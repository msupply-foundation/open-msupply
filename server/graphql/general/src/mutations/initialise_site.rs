use async_graphql::*;

use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};
use service::sync::sync_status::status::InitialisationStatus;

use crate::{queries::sync_settings::SyncSettingsNode, sync_api_error::SyncErrorNode};

use super::common::SyncSettingsInput;

#[derive(Union)]
pub enum InitialiseSiteResponse {
    Response(SyncSettingsNode),
    Error(SyncErrorNode),
}

pub async fn initialise_site(
    ctx: &Context<'_>,
    input: SyncSettingsInput,
) -> Result<InitialiseSiteResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let initialisation_status = service_provider
        .sync_status_service
        .get_initialisation_status(&service_context)?;
    if initialisation_status != InitialisationStatus::PreInitialisation {
        return Err(StandardGraphqlError::from_str_slice(
            "Cannot initialise after PreInitialisation sync state",
        ));
    }

    let sync_settings = input.to_domain();

    if let Err(error) = service_provider
        .site_info_service
        .request_and_set_site_info(service_provider, &sync_settings)
        .await
    {
        return Ok(InitialiseSiteResponse::Error(SyncErrorNode::map_error(
            error,
        )?));
    }

    // request_and_set_site_info above should validate settings, can consider all error in update_sync_settings as internal error
    service_provider
        .settings
        .update_sync_settings(&service_context, &sync_settings)
        .map_err(StandardGraphqlError::from_debug)?;

    service_provider.sync_trigger.trigger();

    Ok(InitialiseSiteResponse::Response(SyncSettingsNode {
        settings: sync_settings,
    }))
}
