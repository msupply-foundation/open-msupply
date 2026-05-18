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
    let service_provider = ctx.service_provider_data();

    // DB-touching status check wrapped
    let service_provider_for_status = service_provider.clone();
    let initialisation_status =
        tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
            let service_context = service_provider_for_status.basic_context()?;
            service_provider_for_status
                .sync_status_service
                .get_initialisation_status(&service_context)
        })
        .await
        .map_err(StandardGraphqlError::from_join_error)?
        .map_err(StandardGraphqlError::from_repository_error)?;

    if initialisation_status != InitialisationStatus::PreInitialisation {
        return Err(StandardGraphqlError::from_str_slice(
            "Cannot initialise after PreInitialisation sync state",
        ));
    }

    let sync_settings = input.to_domain();

    if let Err(error) = service_provider
        .site_info_service
        .request_and_set_site_info(&service_provider, &sync_settings)
        .await
    {
        return Ok(InitialiseSiteResponse::Error(SyncErrorNode::map_error(
            error,
        )?));
    }

    // request_and_set_site_info above should validate settings, can consider all error in update_sync_settings as internal error
    let service_provider_clone = service_provider.clone();
    let sync_settings_clone = sync_settings.clone();
    tokio::task::spawn_blocking(move || -> Result<_> {
        let service_context = service_provider_clone
            .basic_context()
            .map_err(StandardGraphqlError::from_repository_error)?;
        service_provider_clone
            .settings
            .update_sync_settings(&service_context, &sync_settings_clone)
            .map_err(StandardGraphqlError::from_debug)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    service_provider.sync_trigger.trigger(None);

    Ok(InitialiseSiteResponse::Response(SyncSettingsNode {
        settings: sync_settings,
    }))
}
