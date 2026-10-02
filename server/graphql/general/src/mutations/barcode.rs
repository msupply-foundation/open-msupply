use async_graphql::*;
use graphql_core::{
    generic_inputs::NullableUpdateInput,
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::{BarcodeMatchNode, BarcodeNode, DeleteResponse};
use service::{
    auth::{Resource, ResourceAccessRequest},
    barcode::{
        InsertBarcodeInput as ServiceInsertInput, ManageBarcodeError, ProposeBarcodeError,
        ProposeBarcodeInput as ServiceProposeInput, UpdateBarcodeInput as ServiceUpdateInput,
    },
    service_provider::ServiceContext,
    NullableUpdate,
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

#[derive(InputObject)]
pub struct InsertBarcodeInput {
    /// As scanned or typed; the server puts it in standard form
    pub barcode: String,
    pub item_id: String,
    pub pack_size: Option<f64>,
    pub manufacturer_id: Option<String>,
}

#[derive(InputObject)]
pub struct UpdateBarcodeInput {
    pub id: String,
    /// Moves the barcode to another item
    pub item_id: Option<String>,
    pub pack_size: Option<NullableUpdateInput<f64>>,
}

/// Confirmed barcodes, managed on central. Errors are top-level GraphQL errors.
#[derive(Default, Clone)]
pub struct BarcodeMutations;

#[Object]
impl BarcodeMutations {
    /// Adds a confirmed barcode for an item, or brings back a removed one
    pub async fn insert_barcode(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: InsertBarcodeInput,
    ) -> Result<BarcodeNode> {
        let service_context = service_context(ctx, &store_id, Resource::MutateItems)?;
        let InsertBarcodeInput {
            barcode,
            item_id,
            pack_size,
            manufacturer_id,
        } = input;
        map_manage_result(ctx.service_provider().barcode_service.insert_barcode(
            &service_context,
            ServiceInsertInput {
                barcode,
                item_id,
                pack_size,
                manufacturer_id,
            },
        ))
        .map(BarcodeNode::from_domain)
    }

    /// Confirms a store's proposal, so the barcode reaches every site
    pub async fn confirm_barcode_proposal(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        id: String,
    ) -> Result<BarcodeNode> {
        let service_context = service_context(ctx, &store_id, Resource::MutateItems)?;
        map_manage_result(
            ctx.service_provider()
                .barcode_service
                .confirm_barcode_proposal(&service_context, &id),
        )
        .map(BarcodeNode::from_domain)
    }

    /// Changes a confirmed barcode's pack size, or moves it to another item
    pub async fn update_barcode(
        &self,
        ctx: &Context<'_>,
        store_id: String,
        input: UpdateBarcodeInput,
    ) -> Result<BarcodeNode> {
        let service_context = service_context(ctx, &store_id, Resource::MutateItems)?;
        let UpdateBarcodeInput {
            id,
            item_id,
            pack_size,
        } = input;
        map_manage_result(ctx.service_provider().barcode_service.update_barcode(
            &service_context,
            ServiceUpdateInput {
                id,
                item_id,
                pack_size: pack_size.map(|update| NullableUpdate {
                    value: update.value,
                }),
            },
        ))
        .map(BarcodeNode::from_domain)
    }

    /// Removes a confirmed barcode everywhere. Stores proposing it again won't
    /// confirm it; only adding it on central brings it back.
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
            | BarcodeDoesNotExist
            | ProposalDoesNotExist
            | BarcodeAlreadyExistsForItem => StandardGraphqlError::BadUserInput(formatted),
            DatabaseError(_) => StandardGraphqlError::InternalError(formatted),
        };
        graphql_error.extend()
    })
}
