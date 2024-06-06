use async_graphql::*;

use chrono::NaiveDate;
use graphql_core::{
    simple_generic_errors::{OtherPartyNotACustomer, OtherPartyNotVisible},
    standard_graphql_error::{validate_auth, StandardGraphqlError},
    ContextExt,
};
use graphql_types::types::InvoiceNode;
use service::auth::{Resource, ResourceAccessRequest};
use service::invoice::inbound_return::insert::{
    InsertInboundReturn as ServiceInput, InsertInboundReturnError as ServiceError,
};
use service::invoice::inbound_return::InboundReturnLineInput as InboundReturnLineServiceInput;

#[derive(InputObject)]
#[graphql(name = "InboundReturnInput")]
pub struct InsertInput {
    pub id: String,
    pub customer_id: String,
    pub outbound_shipment_id: Option<String>,
    pub inbound_return_lines: Vec<InboundReturnLineInput>,
}

#[derive(InputObject)]
pub struct InboundReturnLineInput {
    pub id: String,
    pub number_of_packs_returned: f64,
    pub item_id: String,
    pub reason_id: Option<String>,
    pub note: Option<String>,
    pub pack_size: f64,
    pub batch: Option<String>,
    pub expiry_date: Option<NaiveDate>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertInboundReturnError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
#[graphql(name = "InsertInboundReturnResponse")]
pub enum InsertResponse {
    Error(InsertError),
    Response(InvoiceNode),
}

pub fn insert(ctx: &Context<'_>, store_id: &str, input: InsertInput) -> Result<InsertResponse> {
    let user = validate_auth(
        ctx,
        &ResourceAccessRequest {
            resource: Resource::MutateInboundReturn,
            store_id: Some(store_id.to_string()),
        },
    )?;

    let service_provider = ctx.service_provider();
    let service_context = service_provider.context(store_id.to_string(), user.user_id)?;

    let result = service_provider
        .invoice_service
        .insert_inbound_return(&service_context, input.to_domain());

    let result = match result {
        Ok(outbound_return) => InsertResponse::Response(InvoiceNode::from_domain(outbound_return)),
        Err(err) => InsertResponse::Error(InsertError {
            error: map_error(err)?,
        }),
    };

    Ok(result)
}

#[derive(Interface)]
#[graphql(name = "InsertInboundReturnErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    OtherPartyNotVisible(OtherPartyNotVisible),
    OtherPartyNotACustomer(OtherPartyNotACustomer),
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
        ServiceError::OtherPartyNotACustomer => {
            return Ok(InsertErrorInterface::OtherPartyNotACustomer(
                OtherPartyNotACustomer,
            ))
        }

        // Standard Graphql Errors
        ServiceError::OutboundShipmentDoesNotExist
        | ServiceError::OutboundShipmentDoesNotBelongToCurrentStore
        | ServiceError::OriginalInvoiceNotAnOutboundShipment
        | ServiceError::CannotReturnOutboundShipment
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
            customer_id,
            outbound_shipment_id,
            inbound_return_lines,
        }: InsertInput = self;

        ServiceInput {
            id,
            other_party_id: customer_id,
            outbound_shipment_id,
            inbound_return_lines: inbound_return_lines
                .into_iter()
                .map(|line| line.to_domain())
                .collect(),
        }
    }
}

impl InboundReturnLineInput {
    pub fn to_domain(self) -> InboundReturnLineServiceInput {
        let InboundReturnLineInput {
            id,
            number_of_packs_returned,
            reason_id,
            note,
            item_id,
            expiry_date,
            batch,
            pack_size,
        }: InboundReturnLineInput = self;

        InboundReturnLineServiceInput {
            id,
            number_of_packs: number_of_packs_returned,
            reason_id,
            note,
            item_id,
            expiry_date,
            batch,
            pack_size,
        }
    }
}
