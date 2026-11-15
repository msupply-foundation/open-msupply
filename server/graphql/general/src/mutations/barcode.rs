use async_graphql::*;
use graphql_core::{
    ContextExt,
    standard_graphql_error::{StandardGraphqlError, validate_auth},
};
use graphql_types::types::{BarcodeMatchNode, BarcodeNode, DeleteResponse};
use service::{
    auth::{Resource, ResourceAccessRequest},
    barcode::{
        BarcodeTarget, DeleteBarcodeProposalError, InsertBarcodeInput as ServiceInsertInput,
        ManageBarcodeError, ProposeBarcodeError, ProposeBarcodeInput as ServiceProposeInput,
    },
    service_provider::ServiceContext,
    sync::CentralServerConfig,
};

fn service_context(
    ctx: &Context<'_>,
    store_id: &str,
    resource: Resource,
) -> Result<ServiceContext> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource,
            store_id: Some(store_id.to_string()),
            require_central_standalone: false,
        },
    )?;
    Ok(ctx
        .service_provider()
        .context(store_id.to_string(), user.user_id)?)
}

#[derive(InputObject)]
pub struct ProposeBarcodeInput {
    /// As scanned or typed; the server puts it in standard form
    pub barcode: String,
    pub item_id: String,
    pub pack_size: Option<f64>,
    pub manufacturer_id: Option<String>,
}

/// Records that a user picked an item for a barcode in this store. Call it when
/// the line the scan opened is saved. The proposal syncs to central for review.
/// Returns the confirmed barcode instead when the barcode is already confirmed for
/// the item. InvalidBarcode and InvalidItem are top-level errors.
pub fn propose_barcode(
    ctx: &Context<'_>,
    store_id: &str,
    input: ProposeBarcodeInput,
) -> Result<BarcodeMatchNode> {
    let service_context = service_context(ctx, store_id, Resource::QueryItems)?;
    let ProposeBarcodeInput {
        barcode,
        item_id,
        pack_size,
        manufacturer_id,
    } = input;
    let result = ctx.service_provider().barcode_service.propose_barcode(
        &service_context,
        ServiceProposeInput {
            barcode,
            item_id,
            pack_size,
            manufacturer_id,
        },
    );
    match result {
        Ok(barcode_match) => Ok(BarcodeMatchNode::from_domain(barcode_match)),
        Err(error) => {
            let formatted = format!("{error:#?}");
            let graphql_error = match error {
                ProposeBarcodeError::InvalidBarcode | ProposeBarcodeError::InvalidItem => {
                    StandardGraphqlError::BadUserInput(formatted)
                }
                ProposeBarcodeError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted)
                }
            };
            Err(graphql_error.extend())
        }
    }
}

/// Withdraws a proposal made by a store on this site, e.g. one that picked the
/// wrong item. Same access as proposing. ProposalDoesNotExist is a top-level error.
pub fn delete_barcode_proposal(
    ctx: &Context<'_>,
    store_id: &str,
    id: &str,
) -> Result<DeleteResponse> {
    let service_context = service_context(ctx, store_id, Resource::QueryItems)?;
    match ctx
        .service_provider()
        .barcode_service
        .delete_barcode_proposal(&service_context, id)
    {
        Ok(id) => Ok(DeleteResponse(id)),
        Err(error) => {
            let formatted = format!("{error:#?}");
            let graphql_error = match error {
                DeleteBarcodeProposalError::ProposalDoesNotExist => {
                    StandardGraphqlError::BadUserInput(formatted)
                }
                DeleteBarcodeProposalError::DatabaseError(_) => {
                    StandardGraphqlError::InternalError(formatted)
                }
            };
            Err(graphql_error.extend())
        }
    }
}

/// Deprecated: the input of the deprecated top-level `insertBarcode`
#[derive(InputObject)]
#[graphql(name = "InsertBarcodeInput")]
pub struct LegacyInsertBarcodeInput {
    pub gtin: String,
    pub item_id: String,
    pub pack_size: Option<f64>,
}

#[derive(Union)]
#[graphql(name = "InsertBarcodeResponse")]
pub enum LegacyInsertBarcodeResponse {
    Response(BarcodeNode),
}

/// Deprecated: kept for clients that predate `proposeBarcode`. On central it adds a
/// confirmed barcode, on the item's auto-created variant; elsewhere it proposes
/// one. Errors are
/// top-level GraphQL errors.
pub fn legacy_insert_barcode(
    ctx: &Context<'_>,
    store_id: &str,
    input: LegacyInsertBarcodeInput,
) -> Result<LegacyInsertBarcodeResponse> {
    let LegacyInsertBarcodeInput {
        gtin,
        item_id,
        pack_size,
    } = input;
    if CentralServerConfig::is_central_server() {
        let service_context = service_context(ctx, store_id, Resource::MutateItems)?;
        let barcode = map_manage_result(ctx.service_provider().barcode_service.insert_barcode(
            &service_context,
            ServiceInsertInput {
                barcode: gtin,
                item_id,
                pack_size,
                manufacturer_id: None,
                target: BarcodeTarget::AutoCreated,
            },
        ))?;
        return Ok(LegacyInsertBarcodeResponse::Response(
            BarcodeNode::from_domain(barcode),
        ));
    }

    let barcode_match = propose_barcode(
        ctx,
        store_id,
        ProposeBarcodeInput {
            barcode: gtin,
            item_id,
            pack_size,
            manufacturer_id: None,
        },
    )?;
    Ok(LegacyInsertBarcodeResponse::Response(
        BarcodeNode::from_match(barcode_match.into_domain()),
    ))
}

#[derive(InputObject)]
pub struct InsertConfirmedBarcodeInput {
    /// As scanned or typed; the server puts it in standard form
    pub barcode: String,
    pub item_id: String,
    pub pack_size: Option<f64>,
    pub manufacturer_id: Option<String>,
    /// Put the barcode on this packaging variant of the item, which has none yet
    pub packaging_variant_id: Option<String>,
    /// Add a packaging variant with the barcode to this item variant of the item
    pub item_variant_id: Option<String>,
}

/// Where a barcode goes: an existing packaging variant, a new packaging variant
/// on an existing item variant, or, with neither, a new packaging variant on the
/// item's auto-created variant for the manufacturer
fn barcode_target(
    packaging_variant_id: Option<String>,
    item_variant_id: Option<String>,
) -> Result<BarcodeTarget> {
    match (packaging_variant_id, item_variant_id) {
        (None, None) => Ok(BarcodeTarget::AutoCreated),
        (Some(id), None) => Ok(BarcodeTarget::PackagingVariant(id)),
        (None, Some(id)) => Ok(BarcodeTarget::ItemVariant(id)),
        (Some(_), Some(_)) => Err(StandardGraphqlError::BadUserInput(
            "Give a packaging variant or an item variant, not both".to_string(),
        )
        .extend()),
    }
}

/// Confirmed barcodes, managed on central. Errors are top-level GraphQL errors.
#[derive(Default, Clone)]
pub struct BarcodeMutations;

#[Object]
impl BarcodeMutations {
    /// Confirms a barcode for an item without a proposal. Confirming one the item
    /// already has returns it.
    pub async fn insert_barcode(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertConfirmedBarcodeInput,
    ) -> Result<BarcodeNode> {
        let service_context = service_context(ctx, &store_id, Resource::MutateItems)?;
        let InsertConfirmedBarcodeInput {
            barcode,
            item_id,
            pack_size,
            manufacturer_id,
            packaging_variant_id,
            item_variant_id,
        } = input;
        map_manage_result(ctx.service_provider().barcode_service.insert_barcode(
            &service_context,
            ServiceInsertInput {
                barcode,
                item_id,
                pack_size,
                manufacturer_id,
                target: barcode_target(packaging_variant_id, item_variant_id)?,
            },
        ))
        .map(BarcodeNode::from_domain)
    }

    /// Confirms a store's proposal, so the barcode reaches every site. With no
    /// packaging variant or item variant given, it goes on the item's auto-created
    /// variant for the proposal's manufacturer.
    pub async fn confirm_barcode_proposal(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
        packaging_variant_id: Option<String>,
        item_variant_id: Option<String>,
    ) -> Result<BarcodeNode> {
        let service_context = service_context(ctx, &store_id, Resource::MutateItems)?;
        let target = barcode_target(packaging_variant_id, item_variant_id)?;
        map_manage_result(
            ctx.service_provider()
                .barcode_service
                .confirm_barcode_proposal(&service_context, &id, target),
        )
        .map(BarcodeNode::from_domain)
    }

    /// Removes the barcode from a packaging variant, everywhere. `id` is the
    /// packaging variant's. The removal is remembered, so the barcode isn't
    /// auto-confirmed for the item again. An auto-created variant left with no
    /// barcode is deleted; confirming the barcode again brings it back.
    pub async fn delete_barcode(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<DeleteResponse> {
        let service_context = service_context(ctx, &store_id, Resource::MutateItems)?;
        map_manage_result(
            ctx.service_provider()
                .barcode_service
                .delete_barcode(&service_context, &id),
        )
        .map(DeleteResponse)
    }
}

fn map_manage_result<T>(result: Result<T, ManageBarcodeError>) -> Result<T> {
    result.map_err(|error| {
        use ManageBarcodeError::*;
        let formatted = format!("{error:#?}");
        let graphql_error = match error {
            NotCentralServer => StandardGraphqlError::Forbidden(formatted),
            InvalidBarcode
            | InvalidItem
            | ProposalDoesNotExist
            | PackagingVariantDoesNotExist
            | ItemVariantDoesNotExist
            | PackagingVariantHasBarcode
            | BarcodeAlreadyExistsForItem => StandardGraphqlError::BadUserInput(formatted),
            DatabaseError(_) => StandardGraphqlError::InternalError(formatted),
        };
        graphql_error.extend()
    })
}
