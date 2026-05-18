use async_graphql::{Context, Result};
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{VVMStatusLogConnector, VVMStatusLogResponse};
use repository::RepositoryError;
use service::auth::{Resource, ResourceAccessRequest};

pub async fn get_vvm_status_log_by_stock_line(
    ctx: &Context<'_>,
    store_id: String,
    stock_line_id: &str,
) -> Result<VVMStatusLogResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryVvmStatus,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let stock_line_id = stock_line_id.to_string();

    let result = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;
        service_provider
            .vvm_service
            .get_vvm_status_logs_by_stock_line(&service_context.connection, &stock_line_id)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(VVMStatusLogResponse::Response(
        VVMStatusLogConnector::from_domain(result),
    ))
}
