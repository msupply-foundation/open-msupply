use async_graphql::*;
use graphql_core::{
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{BarcodeMatchNode, BarcodeNode, BarcodeProposalNode};
use service::auth::{Resource, ResourceAccessRequest};

fn service_context(
    ctx: &Context<'_>,
    store_id: &str,
) -> Result<service::service_provider::ServiceContext> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::QueryItems,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;
    Ok(ctx
        .service_provider()
        .context(store_id.to_string(), user.user_id)?)
}

/// Everything a scan of `barcode` matches: confirmed barcodes first, then
/// proposals made on this site, one per item and only for items visible in the
/// store. Empty for a barcode nobody has mapped yet.
pub fn barcode_matches(
    ctx: &Context<'_>,
    store_id: String,
    barcode: String,
) -> Result<Vec<BarcodeMatchNode>> {
    let service_context = service_context(ctx, &store_id)?;
    let matches = ctx
        .service_provider()
        .barcode_service
        .barcode_matches(&service_context, &barcode)
        .map_err(StandardGraphqlError::from_repository_error)?;
    Ok(matches
        .into_iter()
        .map(BarcodeMatchNode::from_domain)
        .collect())
}

/// The item's confirmed barcodes
pub fn item_barcodes(
    ctx: &Context<'_>,
    store_id: String,
    item_id: String,
) -> Result<Vec<BarcodeNode>> {
    let service_context = service_context(ctx, &store_id)?;
    let barcodes = ctx
        .service_provider()
        .barcode_service
        .item_barcodes(&service_context, &item_id)
        .map_err(StandardGraphqlError::from_repository_error)?;
    Ok(barcodes.into_iter().map(BarcodeNode::from_domain).collect())
}

/// Proposals for the item that central hasn't confirmed or removed: every
/// store's on central, this site's elsewhere
pub fn item_barcode_proposals(
    ctx: &Context<'_>,
    store_id: String,
    item_id: String,
) -> Result<Vec<BarcodeProposalNode>> {
    let service_context = service_context(ctx, &store_id)?;
    let proposals = ctx
        .service_provider()
        .barcode_service
        .item_barcode_proposals(&service_context, &item_id)
        .map_err(StandardGraphqlError::from_repository_error)?;
    Ok(proposals
        .into_iter()
        .map(BarcodeProposalNode::from_domain)
        .collect())
}
