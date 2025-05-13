use async_graphql::{Context, Result};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use service::auth::{Resource, ResourceAccessRequest};

pub fn vvm_statuses_configured(ctx: &Context<'_>, store_id: String) -> Result<bool> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStockLine,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let result = service_provider
        .vvm_service
        .active_vvm_statuses(&service_context.connection)
        .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(!result.is_empty())
}
