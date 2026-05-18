use async_graphql::{Context, Result};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::vvm_status::{VVMStatusConnector, VVMStatusesResponse};
use repository::RepositoryError;
use service::auth::{Resource, ResourceAccessRequest};

pub async fn active_vvm_statuses(
    ctx: &Context<'_>,
    store_id: String,
) -> Result<VVMStatusesResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryVvmStatus,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider_data();

    let result = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;
        service_provider
            .vvm_service
            .active_vvm_statuses(&service_context.connection)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(VVMStatusesResponse::Response(
        VVMStatusConnector::from_domain(result),
    ))
}
