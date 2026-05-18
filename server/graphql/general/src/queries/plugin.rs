use async_graphql::*;
use graphql_core::{standard_graphql_error::StandardGraphqlError, ContextExt};
use service::plugin::FrontendPluginMetadata;

#[derive(PartialEq, Debug, SimpleObject)]
pub struct FrontendPluginMetadataNode {
    pub code: String,
    pub path: String,
    /// Hash of the plugin's bundled file contents — clients append this as a
    /// cache-busting URL token (?v=...) so the browser only refetches when the
    /// bundle's bytes change.
    pub hash: String,
}

pub async fn frontend_plugin_metadata(
    ctx: &Context<'_>,
) -> Result<Vec<FrontendPluginMetadataNode>, Error> {
    let service_provider = ctx.service_provider_data();

    let plugins = tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
        let context = service_provider.basic_context()?;
        Ok(service_provider
            .plugin_service
            .get_frontend_plugins_metadata(&context))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_repository_error)?
    .into_iter()
    .map(FrontendPluginMetadataNode::from_domain)
    .collect();

    Ok(plugins)
}

impl FrontendPluginMetadataNode {
    fn from_domain(
        FrontendPluginMetadata {
            code,
            entry_point,
            hash,
            ..
        }: FrontendPluginMetadata,
    ) -> Self {
        Self {
            path: format!("{code}/{entry_point}"),
            code,
            hash,
        }
    }
}
