use async_graphql::*;
use graphql_core::{
    simple_generic_errors::{NodeError, NodeErrorInterface},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::BarcodeNode;
use service::auth::{Resource, ResourceAccessRequest};

#[derive(Union)]
pub enum BarcodeResponse {
    Error(NodeError),
    Response(BarcodeNode),
}

pub async fn barcode_by_gtin(
    ctx: &Context<'_>,
    store_id: String,
    gtin: String,
) -> Result<BarcodeResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryItems,
            store_id: Some(store_id.clone()),
        },
    )?;

    let service_provider = ctx.service_provider_data();

    let barcode_option = tokio::task::spawn_blocking(move || -> Result<_, repository::RepositoryError> {
        let service_context = service_provider.context(store_id.clone(), user.user_id)?;
        service_provider
            .barcode_service
            .get_barcode_by_gtin(&service_context, &gtin)
    })
    .await
    .map_err(StandardGraphqlError::from_join_error)?
    .map_err(StandardGraphqlError::from_repository_error)?;

    let response = match barcode_option {
        Some(barcode) => BarcodeResponse::Response(BarcodeNode::from_domain(barcode)),
        None => BarcodeResponse::Error(NodeError {
            error: NodeErrorInterface::record_not_found(),
        }),
    };

    Ok(response)
}
