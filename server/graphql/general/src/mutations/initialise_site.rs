use async_graphql::*;

use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};
use service::{settings_service::UpdateSettingsError, sync::sync_status::status::SyncState};

use crate::queries::sync_settings::SyncSettingsNode;

use super::common::SyncSettingsInput;

#[derive(Union)]
pub enum InitialiseSiteResponse {
    Response(SyncSettingsNode),
}

pub async fn initialise_site(
    ctx: &Context<'_>,
    input: SyncSettingsInput,
) -> Result<InitialiseSiteResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let sync_state = service_provider
        .sync_status_service
        .get_sync_state(&service_context)?;
    if sync_state != SyncState::PreInitialisation {
        return Err(StandardGraphqlError::from_str(
            "Cannot initialise after PreInitialisation sync state",
        ));
    }

    let sync_settings = input.to_domain();

    // TODO map to structured error
    service_provider
        .site_info_service
        .request_and_set_site_info(&service_provider, &sync_settings)
        .await
        .map_err(StandardGraphqlError::from_error)?;

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

    service_provider.sync_trigger.trigger();

    Ok(InitialiseSiteResponse::Response(SyncSettingsNode {
        settings: Some(sync_settings),
    }))
}
