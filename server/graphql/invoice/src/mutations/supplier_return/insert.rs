use async_graphql::*;

use graphql_core::{
    simple_generic_errors::{OtherPartyNotASupplier, OtherPartyNotVisible},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InvoiceNode;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::supplier_return::insert::{
    InsertSupplierReturn as ServiceInput, InsertSupplierReturnError as ServiceError,
};

use service::invoice::supplier_return::SupplierReturnLineInput as SupplierReturnLineServiceInput;

#[derive(InputObject)]
#[graphql(name = "SupplierReturnInput")]
pub struct InsertInput {
    pub id: String,
    pub supplier_id: String,
    pub inbound_shipment_id: Option<String>,
    pub supplier_return_lines: Vec<SupplierReturnLineInput>,
}

#[derive(InputObject)]
pub struct SupplierReturnLineInput {
    pub id: String,
    pub stock_line_id: String,
    pub number_of_packs_to_return: f64,
    pub reason_id: Option<String>,
    pub note: Option<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertSupplierReturnError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertSupplierReturnResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateSupplierReturn,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .invoice_service
        .insert_supplier_return(&service_context, input.to_domain());

    let result = match result {
        Ok(supplier_return) => InsertResponse::Response(InvoiceNode::from_domain(supplier_return)),
        Err(err) => InsertResponse::Error(InsertError {
            error: map_error(err)?,
        }),
    };

    Ok(result)
}

#[derive(Interface)]
#[graphql(name = "InsertSupplierReturnErrorInterface")]
#[graphql(field(name = "description", ty = "&str"))]
pub enum InsertErrorInterface {
    OtherPartyNotVisible(OtherPartyNotVisible),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
}

fn map_error(error: ServiceError) -> Result<InsertErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        ServiceError::OtherPartyNotVisible => {
            return Ok(InsertErrorInterface::OtherPartyNotVisible(
                OtherPartyNotVisible,
            ))
        }
        ServiceError::OtherPartyNotASupplier => {
            return Ok(InsertErrorInterface::OtherPartyNotASupplier(
                OtherPartyNotASupplier,
            ))
        }

        // Standard Graphql Errors
        ServiceError::InboundShipmentDoesNotExist
        | ServiceError::InboundShipmentDoesNotBelongToCurrentStore
        | ServiceError::OriginalInvoiceNotAnInboundShipment
        | ServiceError::CannotReturnInboundShipment
        | ServiceError::InvoiceAlreadyExists
        | ServiceError::OtherPartyDoesNotExist => BadUserInput(formatted_error),
        ServiceError::NewlyCreatedInvoiceDoesNotExist
        | ServiceError::LineInsertError { .. }
        | ServiceError::LineReturnReasonUpdateError { .. }
        | ServiceError::DatabaseError(_) => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl InsertInput {
    pub fn to_domain(self) -> ServiceInput {
        let InsertInput {
            id,
            supplier_id,
            supplier_return_lines,
            inbound_shipment_id,
        }: InsertInput = self;

        ServiceInput {
            id,
            other_party_id: supplier_id,
            inbound_shipment_id,
            supplier_return_lines: supplier_return_lines
                .into_iter()
                .map(|line| line.to_domain())
                .collect(),
        }
    }
}

impl SupplierReturnLineInput {
    pub fn to_domain(self) -> SupplierReturnLineServiceInput {
        let SupplierReturnLineInput {
            id,
            stock_line_id,
            number_of_packs_to_return,
            reason_id,
            note,
        }: SupplierReturnLineInput = self;

        SupplierReturnLineServiceInput {
            id,
            stock_line_id,
            number_of_packs: number_of_packs_to_return,
            reason_id,
            note,
        }
    }
}
