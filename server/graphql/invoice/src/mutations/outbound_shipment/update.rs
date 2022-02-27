use super::{
    CannotChangeStatusOfInvoiceOnHold, InvoiceIsNotEditable, NotAnOutboundShipmentError,
    OtherPartyNotACustomerError,
};

use async_graphql::*;
use graphql_core::simple_generic_errors::{CannotReverseInvoiceStatus, NodeError, RecordNotFound};
use graphql_core::standard_graphql_error::StandardGraphqlError;
use graphql_core::ContextExt;
use graphql_types::types::{InvoiceLineConnector, InvoiceNode, NameNode};

use service::invoice::outbound_shipment::{
    UpdateOutboundShipment as ServiceInput, UpdateOutboundShipmentError as ServiceError,
    UpdateOutboundShipmentStatus,
};

#[derive(InputObject)]
#[graphql(name = "UpdateOutboundShipmentInput")]
pub struct UpdateInput {
    /// The new invoice id provided by the client
    pub id: String,
    /// The other party must be a customer of the current store.
    /// This field can be used to change the other_party of an invoice
    other_party_id: Option<String>,
    /// When changing the status from DRAFT to CONFIRMED or FINALISED the total_number_of_packs for
    /// existing invoice items gets updated.
    status: Option<UpdateOutboundShipmentStatusInput>,
    on_hold: Option<bool>,
    comment: Option<String>,
    /// External invoice reference, e.g. purchase or shipment number
    their_reference: Option<String>,
    colour: Option<String>,
}

#[derive(Enum, Copy, Clone, PartialEq, Eq, Debug)]
pub enum UpdateOutboundShipmentStatusInput {
    Allocated,
    Picked,
    Shipped,
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateOutboundShipmentError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
#[graphql(name = "UpdateOutboundShipmentResponse")]
pub enum UpdateResponse {
    Error(UpdateError),
    NodeError(NodeError),
    Response(InvoiceNode),
}

pub fn update(ctx: &Context<'_>, store_id: &str, input: UpdateInput) -> Result<UpdateResponse> {
    let service_provider = ctx.service_provider();
    let service_context = service_provider.context()?;

    let response = match service_provider.invoice_service.update_outbound_shipment(
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
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateErrorInterface {
    InvoiceDoesNotExists(RecordNotFound),
    CannotReverseInvoiceStatus(CannotReverseInvoiceStatus),
    CannotChangeStatusOfInvoiceOnHold(CannotChangeStatusOfInvoiceOnHold),
    InvoiceIsNotEditable(InvoiceIsNotEditable),
    OtherPartyNotACustomer(OtherPartyNotACustomerError),
    NotAnOutboundShipment(NotAnOutboundShipmentError),
    CanOnlyChangeToAllocatedWhenNoUnallocatedLines(CanOnlyChangeToAllocatedWhenNoUnallocatedLines),
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
        ServiceError::InvoiceDoesNotExists => {
            return Ok(UpdateErrorInterface::InvoiceDoesNotExists(
                RecordNotFound {},
            ))
        }
        ServiceError::CannotReverseInvoiceStatus => {
            return Ok(UpdateErrorInterface::CannotReverseInvoiceStatus(
                CannotReverseInvoiceStatus {},
            ))
        }
        ServiceError::InvoiceIsNotEditable => {
            return Ok(UpdateErrorInterface::InvoiceIsNotEditable(
                InvoiceIsNotEditable {},
            ))
        }

        ServiceError::CannotChangeStatusOfInvoiceOnHold => {
            return Ok(UpdateErrorInterface::CannotChangeStatusOfInvoiceOnHold(
                CannotChangeStatusOfInvoiceOnHold {},
            ))
        }
        ServiceError::CanOnlyChangeToAllocatedWhenNoUnallocatedLines(lines) => {
            return Ok(
                UpdateErrorInterface::CanOnlyChangeToAllocatedWhenNoUnallocatedLines(
                    CanOnlyChangeToAllocatedWhenNoUnallocatedLines(InvoiceLineConnector::from_vec(
                        lines,
                    )),
                ),
            )
        }
        ServiceError::OtherPartyNotACustomer(name) => {
            return Ok(UpdateErrorInterface::OtherPartyNotACustomer(
                OtherPartyNotACustomerError(NameNode { name }),
            ))
        }
        // Standard Graphql Errors
        ServiceError::NotAnOutboundShipment => BadUserInput(formatted_error),
        ServiceError::OtherPartyCannotBeThisStore => BadUserInput(formatted_error),
        ServiceError::OtherPartyDoesNotExists => BadUserInput(formatted_error),
        ServiceError::DatabaseError(_) => InternalError(formatted_error),
        ServiceError::InvoiceLineHasNoStockLine(_) => InternalError(formatted_error),
        ServiceError::UpdatedInvoicenDoesNotExist => InternalError(formatted_error),
    };

    Err(graphql_error.extend())
}
pub struct CanOnlyChangeToAllocatedWhenNoUnallocatedLines(pub InvoiceLineConnector);

#[Object]
impl CanOnlyChangeToAllocatedWhenNoUnallocatedLines {
    pub async fn description(&self) -> &'static str {
        "Cannot change to allocated status when unallocated lines are present"
    }

    pub async fn invoice_lines(&self) -> &InvoiceLineConnector {
        &self.0
    }
}

impl UpdateOutboundShipmentStatusInput {
    pub fn to_domain(&self) -> UpdateOutboundShipmentStatus {
        use UpdateOutboundShipmentStatus::*;
        match self {
            UpdateOutboundShipmentStatusInput::Allocated => Allocated,
            UpdateOutboundShipmentStatusInput::Picked => Picked,
            UpdateOutboundShipmentStatusInput::Shipped => Shipped,
        }
    }
}
