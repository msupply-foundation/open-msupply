use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    plugin::{InstalledPlugin, InstalledPluginKind},
};
use util::format_error;

#[derive(SimpleObject)]
pub struct InstalledPluginNode {
    pub id: String,
    pub code: String,
    pub version: String,
    pub kind: InstalledPluginKindType,
    pub types: Vec<String>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq)]
pub enum InstalledPluginKindType {
    Backend,
    Frontend,
}

impl InstalledPluginNode {
    pub fn from_domain(plugin: InstalledPlugin) -> Self {
        InstalledPluginNode {
            id: plugin.id,
            code: plugin.code,
            version: plugin.version,
            kind: match plugin.kind {
                InstalledPluginKind::Backend => InstalledPluginKindType::Backend,
                InstalledPluginKind::Frontend => InstalledPluginKindType::Frontend,
            },
            types: plugin.types,
        }
    }
}

#[derive(SimpleObject)]
pub struct InstalledPluginConnector {
    pub nodes: Vec<InstalledPluginNode>,
    pub total_count: u32,
}

pub fn installed_plugins(ctx: &Context<'_>) -> Result<InstalledPluginConnector> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ConfigurePlugin,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    let plugins = service_provider
        .plugin_service
        .installed_plugins(&context)
        .map_err(|e| StandardGraphqlError::InternalError(format_error(&e)).extend())?;

    let total_count = plugins.len() as u32;
    let nodes = plugins
        .into_iter()
        .map(InstalledPluginNode::from_domain)
        .collect();

    Ok(InstalledPluginConnector { nodes, total_count })
}
