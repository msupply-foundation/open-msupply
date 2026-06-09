use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    plugin::{InstalledPluginKind, UninstallPluginError, UninstallPluginResult},
};
use util::format_error;

use crate::queries::installed_plugins::InstalledPluginKindType;

#[derive(SimpleObject)]
pub struct UninstallPluginNode {
    pub id: String,
    pub code: String,
    pub kind: InstalledPluginKindType,
}

impl UninstallPluginNode {
    fn from_domain(result: UninstallPluginResult) -> Self {
        Self {
            id: result.id,
            code: result.code,
            kind: match result.kind {
                InstalledPluginKind::Backend => InstalledPluginKindType::Backend,
                InstalledPluginKind::Frontend => InstalledPluginKindType::Frontend,
            },
        }
    }
}

pub fn uninstall_plugin(ctx: &Context<'_>, id: String) -> Result<UninstallPluginNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ConfigurePlugin,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;

    service_provider
        .plugin_service
        .uninstall_plugin(&context, &id)
        .map(UninstallPluginNode::from_domain)
        .map_err(|e| match e {
            UninstallPluginError::PluginNotFound => {
                StandardGraphqlError::BadUserInput(format_error(&e)).extend()
            }
            UninstallPluginError::DatabaseError(_) => {
                StandardGraphqlError::InternalError(format_error(&e)).extend()
            }
        })
}
