use async_graphql::*;
use graphql_core::{
    simple_generic_errors::NodeError,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{RepackConnector, RepackNode};
use repository::RepositoryError;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Union)]
pub enum RepackResponse {
    Error(NodeError),
    Response(RepackNode),
}

pub async fn get_repack(
    ctx: &Context<'_>,
    store_id: String,
    invoice_id: &str,
) -> Result<RepackResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStockLine,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let invoice_id = invoice_id.to_string();

    let repack = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let service_context = service_provider.context(store_id, user.user_id)?;
        service_provider
            .repack_service
            .get_repack(&service_context, &invoice_id)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(RepackResponse::Response(RepackNode::from_domain(repack)))
}

pub async fn get_repacks_by_stock_line(
    ctx: &Context<'_>,
    store_id: String,
    stock_line_id: &str,
) -> Result<RepackConnector> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryStockLine,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider_data();
    let stock_line_id = stock_line_id.to_string();

    let repacks = tokio::task::spawn_blocking(move || -> Result<_, RepositoryError> {
        let service_context = service_provider.context(store_id, user.user_id)?;
        service_provider
            .repack_service
            .get_repacks_by_stock_line(&service_context, &stock_line_id)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)??;

    Ok(RepackConnector::from_vec(repacks))
}
