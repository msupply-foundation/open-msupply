use async_graphql::*;
use graphql_core::ContextExt;
use service::plugin::FrontendPluginMetadata;

#[derive(PartialEq, Debug, SimpleObject)]
pub struct FrontendPluginMetadataNode {
    pub code: String,
    pub path: String,
}

pub fn frontend_plugin_metadata(
    ctx: &Context<'_>,
) -> Result<Vec<FrontendPluginMetadataNode>, Error> {
    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let plugins = service_provider
        .plugin_service
        .get_frontend_plugins_metadata(&context)
        .into_iter()
        .map(FrontendPluginMetadataNode::from_domain)
        .collect();

    Ok(plugins)
}

impl FrontendPluginMetadataNode {
    fn from_domain(FrontendPluginMetadata { code, entry_point }: FrontendPluginMetadata) -> Self {
        Self {
            path: format!("{code}/{entry_point}"),
            code,
        }
    }
}
