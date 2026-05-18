use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{Resource, ResourceAccessRequest};

use crate::{queries::sync_settings::SyncSettingsNode, sync_api_error::SyncErrorNode};

use super::common::SyncSettingsInput;

#[derive(Union)]
pub enum UpdateSyncSettingsResponse {
    Response(SyncSettingsNode),
    Error(SyncErrorNode),
}

pub async fn update_sync_settings(
    ctx: &Context<'_>,
    input: SyncSettingsInput,
) -> Result<UpdateSyncSettingsResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider_data();

    // Sync prelude (DB-touching) wrapped in spawn_blocking
    let service_provider_clone = service_provider.clone();
    let database_sync_settings = tokio::task::spawn_blocking(move || -> Result<_> {
        let service_context = service_provider_clone
            .basic_context()
            .map_err(StandardGraphqlError::from_repository_error)?;
        service_provider_clone
            .settings
            .sync_settings(&service_context)
            .map_err(StandardGraphqlError::from_repository_error)?
            .ok_or(StandardGraphqlError::from_str_slice(
                "Sync settings are missing after initialisation",
            ))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    let sync_settings = input.to_domain();

    if sync_settings.core_site_details_changed(&database_sync_settings) {
        if let Err(error) = service_provider
            .site_info_service
            .request_and_set_site_info(&service_provider, &sync_settings)
            .await
        {
            return Ok(UpdateSyncSettingsResponse::Error(SyncErrorNode::map_error(
                error,
            )?));
        }
    }

    // request and set site info above should validate settings, can consider all errors in update_sync_settings as internal errors
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

    Ok(UpdateSyncSettingsResponse::Response(SyncSettingsNode {
        settings: sync_settings,
    }))
}
