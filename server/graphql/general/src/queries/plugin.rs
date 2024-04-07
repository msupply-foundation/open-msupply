use async_graphql::*;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};
use service::plugin::plugin_files::PluginFileService;

#[derive(PartialEq, Debug, SimpleObject)]
pub struct PluginNode {
    pub config: String,
    pub name: String,
    pub path: String,
}

pub fn get_plugins(ctx: &Context<'_>) -> Result<Vec<PluginNode>, Error> {
    let settings = ctx.get_settings();
    let validated_plugins = ctx.get_validated_plugins();
    let plugins = PluginFileService::plugin_files(validated_plugins, &settings.server.base_dir)
        .map_err(|err| StandardGraphqlError::InternalError(format!("{:?}", err)))?;
    let plugins: Vec<PluginNode> = plugins
        .into_iter()
        .map(|plugin| PluginNode {
            config: plugin.config,
            name: plugin.name,
            path: plugin.path,
        })
        .collect();

    Ok(plugins)
}
