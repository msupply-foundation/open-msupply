use async_graphql::*;
use graphql_core::ContextExt;
use graphql_types::types::PluginNode;
use service::plugin_files::PluginFileService;

pub fn get_plugins(ctx: &Context<'_>) -> Result<Vec<PluginNode>> {
    let settings = ctx.get_settings();
    let service = PluginFileService::new(&settings.server.base_dir);
    let plugins = service.unwrap().find_files()?;

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
