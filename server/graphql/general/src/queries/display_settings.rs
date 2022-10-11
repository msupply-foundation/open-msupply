use async_graphql::*;
use graphql_core::ContextExt;
use service::settings::DisplaySettings;

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
}

pub(crate) fn display_settings(ctx: &Context<'_>) -> Result<Option<DisplaySettingsNode>> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let settings = service_provider
        .display_settings_service
        .display_settings(&service_context)?;
    Ok(settings.map(|settings| DisplaySettingsNode { settings }))
}
