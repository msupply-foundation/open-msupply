use actix_web::web::Data;
use async_graphql::*;
use graphql_core::standard_graphql_error::{validate_auth, StandardGraphqlError};
use service::{
    auth::{Resource, ResourceAccessRequest},
    service_provider::ServiceProvider,
};

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

    let service_provider = ctx.data_unchecked::<Data<ServiceProvider>>().clone();
    let store_id = store_id.to_string();
    let plugin_code = plugin_code.to_string();

    // The plugin service method is sync, so run it on the blocking pool rather than the request
    // worker's runtime thread (#11949). The plugin call it makes dispatches itself to the
    // dedicated plugin runtime (see call_plugin), so the boajs engine cache stays on managed
    // threads (#11943).
    let result = tokio::task::spawn_blocking(move || {
        service_provider
            .plugin_service
            .plugin_graphql_query(store_id, &plugin_code, input)
    })
    .await
    .map_err(|e| StandardGraphqlError::InternalError(format!("Plugin task error: {e}")).extend())?
    .map_err(|e| StandardGraphqlError::from_error(&e))?;

    Ok(result)
}
