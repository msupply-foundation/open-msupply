use crate::queries::uploaded_info::PluginInfoNode;
use async_graphql::Context;
use async_graphql::*;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};
use service::UploadedFile;
use util::format_error;

pub fn install_uploaded_plugin(ctx: &Context<'_>, file_id: String) -> Result<PluginInfoNode> {
    let service_provider = ctx.service_provider();
    let context = service_provider.basic_context()?;
    let settings = ctx.get_settings();

    service_provider
        .plugin_service
        .install_uploaded_plugin(&context, settings, UploadedFile { file_id })
        .map_err(|e| StandardGraphqlError::InternalError(format_error(&e)).extend())
        .map(PluginInfoNode::from_domain)
}
