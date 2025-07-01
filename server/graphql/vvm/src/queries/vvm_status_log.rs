use async_graphql::{Context, Result};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{VVMStatusLogConnector, VVMStatusLogResponse};
use service::auth::{Resource, ResourceAccessRequest};

pub fn get_vvm_status_log_by_stock_line(
    ctx: &Context<'_>,
    store_id: String,
    stock_line_id: &str,
) -> Result<VVMStatusLogResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryAndMutateVvmStatus,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.clone(), user.user_id)?;

    let result = service_provider
        .vvm_service
        .get_vvm_status_logs_by_stock_line(&service_context.connection, stock_line_id)
        .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(VVMStatusLogResponse::Response(
        VVMStatusLogConnector::from_domain(result),
    ))
}
