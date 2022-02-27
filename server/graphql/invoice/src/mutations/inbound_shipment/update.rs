use crate::mutations::outbound_shipment::CannotChangeStatusOfInvoiceOnHold;
use async_graphql::*;

use graphql_core::simple_generic_errors::CannotEditInvoice;
use graphql_core::simple_generic_errors::{CannotReverseInvoiceStatus, RecordNotFound};
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::generic_errors::OtherPartyNotASupplier;
use graphql_types::types::{InvoiceNode, NameNode};
use service::invoice::inbound_shipment::{
    UpdateInboundShipment as ServiceInput, UpdateInboundShipmentError as ServiceError,
    UpdateInboundShipmentStatus,
};

#[derive(InputObject)]
#[graphql(name = "UpdateInboundShipmentInput")]
pub struct UpdateInput {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<UpdateInboundShipmentStatusInput>,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UpdateInboundShipmentStatusInput {
    Delivered,
    Verified,
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateInboundShipmentError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateInboundShipmentResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    Response(InvoiceNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider.invoice_service.update_inbound_shipment(
        &service_context,
        store_id,
        input.to_domain(),
    ) {
        Ok(requisition) => UpdateResponse::Response(InvoiceNode::from_domain(requisition)),
        Err(error) => UpdateResponse::Error(UpdateError {
            error: map_error(error)?,
        }),
    };

    Ok(response)
}

#[derive(Interface)]
#[graphql(name = "UpdateInboundShipmentErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateErrorInterface {
    RecordNotFound(RecordNotFound),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
    CannotEditInvoice(CannotEditInvoice),
    CannotReverseInvoiceStatus(CannotReverseInvoiceStatus),
    CannotChangeStatusOfInvoiceOnHold(CannotChangeStatusOfInvoiceOnHold),
}

impl UpdateInput {
    fn to_domain(self) -> ServiceInput {
        let UpdateInput {
            id,
            other_party_id,
            status,
            on_hold,
            comment,
            their_reference,
            colour,
        } = self;

        ServiceInput {
            id,
            other_party_id,
            status: status.map(|status| status.to_domain()),
            on_hold,
            comment,
            their_reference,
            colour,
        }
    }
}

fn map_error(error: ServiceError) -> Result<UpdateErrorInterface> {
    use StandardGraphqlError::*;
    let formatted_error = format!("{:#?}", error);

    let graphql_error = match error {
        // Structured Errors
        ServiceError::InvoiceDoesNotExist => {
            return Ok(UpdateErrorInterface::RecordNotFound(RecordNotFound {}))
        }
        ServiceError::CannotReverseInvoiceStatus => {
            return Ok(UpdateErrorInterface::CannotReverseInvoiceStatus(
                CannotReverseInvoiceStatus {},
            ))
        }
        ServiceError::CannotEditFinalised => {
            return Ok(UpdateErrorInterface::CannotEditInvoice(
                CannotEditInvoice {},
            ))
        }

        ServiceError::CannotChangeStatusOfInvoiceOnHold => {
            return Ok(UpdateErrorInterface::CannotChangeStatusOfInvoiceOnHold(
                CannotChangeStatusOfInvoiceOnHold {},
            ))
        }
        ServiceError::OtherPartyNotASupplier(name) => {
            return Ok(UpdateErrorInterface::OtherPartyNotASupplier(
                OtherPartyNotASupplier(NameNode { name }),
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotThisStoreInvoice => BadUserInput(formatted_error),
        ServiceError::NotAnInboundShipment => BadUserInput(formatted_error),
        ServiceError::OtherPartyDoesNotExist => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::UpdatedInvoiceDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}

impl UpdateInboundShipmentStatusInput {
    pub fn to_domain(&self) -> UpdateInboundShipmentStatus {
        use UpdateInboundShipmentStatus::*;
        match self {
            UpdateInboundShipmentStatusInput::Delivered => Delivered,
            UpdateInboundShipmentStatusInput::Verified => Verified,
        }
    }
}
