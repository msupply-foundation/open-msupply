use async_graphql::*;
use graphql_core::ContextExt;
use service::plugin_files::PluginFileService;

#[derive(PartialEq, Debug, SimpleObject)]
pub struct PluginNode {
    pub config: String,
    pub name: String,
    pub path: String,
}

pub fn get_plugins(ctx: &Context<'_>) -> Result<Vec<PluginNode>, Error> {
    let settings = ctx.get_settings();
    let plugins = PluginFileService::find_files(&settings.server.base_dir)?;
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
