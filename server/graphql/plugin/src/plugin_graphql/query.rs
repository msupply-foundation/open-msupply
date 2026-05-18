use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{Resource, ResourceAccessRequest};

pub async fn plugin_graphql_query(
    ctx: &Context<'_>,
    store_id: &str,
    plugin_code: &str,
    input: serde_json::Value,
) -> Result<serde_json::Value> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::PluginGraphql,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let store_id = store_id.to_string();
    let plugin_code = plugin_code.to_string();

    tokio::task::spawn_blocking(move || -> async_graphql::Result<serde_json::Value> {
        service_provider
            .plugin_service
            .plugin_graphql_query(store_id, &plugin_code, input)
            .map_err(|e| StandardGraphqlError::from_error(&e))
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
}
