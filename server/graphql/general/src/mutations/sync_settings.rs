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

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let database_sync_settings = service_provider
        .settings
        .sync_settings(&service_context)?
        .ok_or(StandardGraphqlError::from_str(
            "Sync settings are missing after initialisation",
        ))?;

    let sync_settings = input.to_domain();

    if sync_settings.core_site_details_changed(&database_sync_settings) {
        if let Err(error) = service_provider
            .site_info_service
            .request_and_set_site_info(service_provider, &sync_settings)
            .await
        {
            return Ok(UpdateSyncSettingsResponse::Error(SyncErrorNode::map_error(
                error,
            )?));
        }
    }

    // request and set site info above should validate settings, can consider all errors in update_sync_settings as internal errors
    service_provider
        .settings
        .update_sync_settings(&service_context, &sync_settings)
        .map_err(StandardGraphqlError::from_debug)?;

    Ok(UpdateSyncSettingsResponse::Response(SyncSettingsNode {
        settings: sync_settings,
    }))
}
