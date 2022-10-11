use async_graphql::*;
use graphql_core::{standard_graphql_error::validate_auth, ContextExt};
use service::{
    auth::{Resource, ResourceAccessRequest},
    settings::DisplaySettings,
};

pub struct DisplaySettingsNode {
    pub settings: DisplaySettings,
}

#[Object]
impl DisplaySettingsNode {
    /// Custom logo
    pub async fn custom_logo(&self) -> Option<String> {
        self.settings.custom_logo.clone()
    }

    /// Custom theme
    pub async fn custom_theme(&self) -> Option<String> {
        self.settings.custom_theme.clone()
    }

    /// Default language
    pub async fn default_language(&self) -> String {
        self.settings.default_language.clone()
    }
}

pub(crate) fn display_settings(
    ctx: &Context<'_>,
    with_auth: bool,
) -> Result<Option<DisplaySettingsNode>> {
    if with_auth {
        validate_auth(
            ctx,
            &ResourceAccessRequest {
                resource: Resource::ServerAdmin,
                store_id: None,
            },
        )?;
    }

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let settings = service_provider
        .display_settings_service
        .display_settings(&service_context)?;
    Ok(settings.map(|settings| DisplaySettingsNode { settings }))
}
