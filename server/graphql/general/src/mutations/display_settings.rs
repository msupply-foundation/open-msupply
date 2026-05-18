use async_graphql::*;

use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    display_settings_service,
};
#[derive(InputObject)]
pub struct DisplaySettingsInput {
    pub custom_logo: Option<String>,
    pub custom_theme: Option<String>,
}

#[derive(SimpleObject)]
pub struct UpdateResult {
    pub logo: Option<String>,
    pub theme: Option<String>,
}

#[derive(Union)]
pub enum UpdateDisplaySettingsResponse {
    Response(UpdateResult),
    Error(UpdateDisplaySettingsError),
}

impl UpdateDisplaySettingsResponse {
    fn from_domain(from: display_settings_service::UpdateResult) -> UpdateDisplaySettingsResponse {
        UpdateDisplaySettingsResponse::Response(UpdateResult {
            logo: from.logo,
            theme: from.theme,
        })
    }
}

#[derive(SimpleObject)]
pub struct UpdateDisplaySettingsError {
    pub error: String,
}

impl DisplaySettingsInput {
    pub fn to_domain(&self) -> service::settings::DisplaySettingsInput {
        service::settings::DisplaySettingsInput {
            custom_logo: self.custom_logo.clone(),
            custom_theme: self.custom_theme.clone(),
        }
    }
}

pub async fn update_display_settings(
    ctx: &Context<'_>,
    input: DisplaySettingsInput,
) -> Result<UpdateDisplaySettingsResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ServerAdmin,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let input = input.to_domain();

    let result = tokio::task::spawn_blocking(move || -> Result<_> {
        let service_context = service_provider
            .basic_context()
            .map_err(StandardGraphqlError::from_repository_error)?;
        service_provider
            .display_settings_service
            .update_display_settings(&service_context, &input)
            .map_err(async_graphql::Error::from)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(UpdateDisplaySettingsResponse::from_domain(result))
}
