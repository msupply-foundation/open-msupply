use async_graphql::*;
use graphql_core::ContextExt;

#[derive(SimpleObject)]
pub struct DisplaySettingNode {
    pub value: String,
    pub hash: String,
}

impl DisplaySettingNode {
    fn from_domain(from: service::settings::DisplaySettingNode) -> DisplaySettingNode {
        DisplaySettingNode {
            value: from.value,
            hash: from.hash,
        }
    }
}

#[derive(SimpleObject)]
pub struct DisplaySettingsNode {
    pub custom_logo: Option<DisplaySettingNode>,
    pub custom_theme: Option<DisplaySettingNode>,
}

#[derive(InputObject)]
pub struct DisplaySettingsHash {
    pub logo: String,
    pub theme: String,
}

fn match_node(
    node: Option<service::settings::DisplaySettingNode>,
    hash: String,
) -> Option<DisplaySettingNode> {
    match node {
        // If the value is empty we need to return a value to indicate that the value should be reset
        Some(setting) => match setting.hash == hash {
            true => None,
            false => Some(DisplaySettingNode::from_domain(setting)),
        },
        None => None,
    }
}

pub(crate) fn display_settings(
    ctx: &Context<'_>,
    input: DisplaySettingsHash,
) -> Result<DisplaySettingsNode> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let settings = service_provider
        .display_settings_service
        .display_settings(&service_context)?;

    let display_settings = DisplaySettingsNode {
        custom_logo: match_node(settings.custom_logo, input.logo),
        custom_theme: match_node(settings.custom_theme, input.theme),
    };

    Ok(display_settings)
}
