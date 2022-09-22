use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    settings_service::UpdateSettingsError,
};

use crate::queries::sync_settings::SyncSettingsNode;

use super::common::SyncSettingsInput;

#[derive(Union)]
pub enum UpdateSyncSettingsResponse {
    Response(SyncSettingsNode),
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
        // TODO map to structured error
        service_provider
            .site_info_service
            .request_and_set_site_info(&service_provider, &sync_settings)
            .await
            .map_err(StandardGraphqlError::from_error)?;
    }

    match service_provider
        .settings
        .update_sync_settings(&service_context, &sync_settings)
    {
        Ok(sync_settings) => sync_settings,
        Err(error) => {
            let formatted_error = format!("{:#?}", error);
            let graphql_error = match error {
                UpdateSettingsError::RepositoryError(_) => {
                    StandardGraphqlError::InternalError(formatted_error)
                }
                UpdateSettingsError::InvalidSettings(_) => {
                    StandardGraphqlError::BadUserInput(formatted_error)
                }
            };
            return Err(graphql_error.extend());
        }
    };

    Ok(UpdateSyncSettingsResponse::Response(SyncSettingsNode {
        settings: Some(sync_settings),
    }))
}
