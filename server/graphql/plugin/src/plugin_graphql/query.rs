use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{Resource, ResourceAccessRequest};

pub fn plugin_graphql_query(
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

    let service_provider = ctx.service_provider();

    let result = service_provider
        .plugin_service
        .plugin_graphql_query(store_id.to_string(), plugin_code, input)
        .map_err(|e| StandardGraphqlError::from_error(&e))?;

    Ok(result)
}
