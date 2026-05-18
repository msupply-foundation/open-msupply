use crate::queries::uploaded_info::PluginInfoNode;
use async_graphql::Context;
use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::{
    auth::{Resource, ResourceAccessRequest},
    UploadedFile,
};
use util::format_error;

pub async fn install_uploaded_plugin(
    ctx: &Context<'_>,
    file_id: String,
) -> Result<PluginInfoNode> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::ConfigurePlugin,
            store_id: None,
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let settings = ctx.get_settings().clone();

    let bundle = tokio::task::spawn_blocking(move || {
        let context = service_provider.basic_context()?;
        service_provider.plugin_service.install_uploaded_plugin(
            &context,
            &settings,
            UploadedFile { file_id },
        )
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(|e| StandardGraphqlError::InternalError(format_error(&e)).extend())?;

    Ok(PluginInfoNode::from_domain(bundle))
}
