use async_graphql::{Context, Result};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{VVMStatusConnector, VVMStatusesResponse};
use service::auth::{Resource, ResourceAccessRequest};

pub fn active_vvm_statuses(ctx: &Context<'_>, store_id: String) -> Result<VVMStatusesResponse> {
    validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryAndMutateVvmStatus,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.basic_context()?;

    let result = service_provider
        .vvm_service
        .active_vvm_statuses(&service_context.connection)
        .map_err(StandardGraphqlError::from_repository_error)?;

    Ok(VVMStatusesResponse::Response(
        VVMStatusConnector::from_domain(result),
    ))
}
