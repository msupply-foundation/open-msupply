use async_graphql::*;

use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
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
    pub logo: bool,
    pub theme: bool,
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
    pub fn to_domain(&self) -> service::settings::DisplaySettings {
        service::settings::DisplaySettings {
            custom_logo: self.custom_logo.clone(),
            custom_theme: self.custom_theme.clone(),
        }
    }
}

pub fn update_display_settings(
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

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;
    let display_settings = input.to_domain();
    let result = service_provider
        .display_settings_service
        .update_display_settings(&service_context, &display_settings);

    match result {
        Ok(result) => Ok(UpdateDisplaySettingsResponse::from_domain(result)),
        Err(error) => Err(async_graphql::Error::from(error)),
    }
}
