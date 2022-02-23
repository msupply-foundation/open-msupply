use domain::outbound_shipment::{UpdateOutboundShipment, UpdateOutboundShipmentStatus};
use graphql_core::{
    simple_generic_errors::{
        CannotReverseInvoiceStatus, DatabaseError, ForeignKey, ForeignKeyError, NodeError, RecordNotFound,
    },
};
use graphql_types::types::{InvoiceLineConnector, InvoiceNode, NameNode};
use repository::StorageConnectionManager;
use service::invoice::{update_outbound_shipment, UpdateOutboundShipmentError};

use async_graphql::*;

use crate::invoice_queries::{get_invoice, InvoiceResponse};

use super::{
    CanOnlyEditInvoicesInLoggedInStoreError, CannotChangeStatusOfInvoiceOnHold,
    InvoiceIsNotEditable, OtherPartyCannotBeThisStoreError, OtherPartyNotACustomerError, NotAnOutboundShipmentError, InvoiceLineHasNoStockLineError,
};

#[derive(InputObject)]
pub struct UpdateOutboundShipmentInput {
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

impl From<UpdateOutboundShipmentInput> for UpdateOutboundShipment {
    fn from(input: UpdateOutboundShipmentInput) -> Self {
        UpdateOutboundShipment {
            id: input.id,
            other_party_id: input.other_party_id,
            status: input.status.map(|status| status.to_domain()),
            on_hold: input.on_hold,
            comment: input.comment,
            their_reference: input.their_reference,
            colour: input.colour,
        }
    }
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateOutboundShipmentError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
pub enum UpdateOutboundShipmentResponse {
    Error(UpdateError),
    NodeError(NodeError),
    Response(InvoiceNode),
}

pub fn get_update_outbound_shipment_response(
    connection_manager: &StorageConnectionManager,
    input: UpdateOutboundShipmentInput,
) -> UpdateOutboundShipmentResponse {
    use UpdateOutboundShipmentResponse::*;
    let connection = match connection_manager.connection() {
        Ok(con) => con,
        Err(err) => {
            return UpdateOutboundShipmentResponse::Error(UpdateError {
                error: UpdateErrorInterface::DatabaseError(DatabaseError(err)),
            })
        }
    };
    match update_outbound_shipment(&connection, input.into()) {
        Ok(id) => match get_invoice(connection_manager, None, id) {
            InvoiceResponse::Response(node) => Response(node),
            InvoiceResponse::Error(err) => NodeError(err),
        },
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateErrorInterface {
    CannotReverseInvoiceStatus(CannotReverseInvoiceStatus),
    CannotChangeStatusOfInvoiceOnHold(CannotChangeStatusOfInvoiceOnHold),
    CanOnlyEditInvoicesInLoggedInStore(CanOnlyEditInvoicesInLoggedInStoreError),
    InvoiceIsNotEditable(InvoiceIsNotEditable),
    InvoiceDoesNotExists(RecordNotFound),
    OtherPartyCannotBeThisStore(OtherPartyCannotBeThisStoreError),
    /// Other party does not exist
    ForeignKeyError(ForeignKeyError),
    OtherPartyNotACustomer(OtherPartyNotACustomerError),
    NotAnOutboundShipment(NotAnOutboundShipmentError),
    DatabaseError(DatabaseError),
    InvalidInvoiceLine(InvoiceLineHasNoStockLineError),
    CanOnlyChangeToAllocatedWhenNoUnallocatedLines(CanOnlyChangeToAllocatedWhenNoUnallocatedLines),
}

impl From<UpdateOutboundShipmentError> for UpdateOutboundShipmentResponse {
    fn from(error: UpdateOutboundShipmentError) -> Self {
        use UpdateErrorInterface as OutError;
        let error = match error {
            UpdateOutboundShipmentError::CannotReverseInvoiceStatus => {
                OutError::CannotReverseInvoiceStatus(CannotReverseInvoiceStatus {})
            }
            UpdateOutboundShipmentError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            UpdateOutboundShipmentError::InvoiceDoesNotExists => {
                OutError::InvoiceDoesNotExists(RecordNotFound {})
            }
            UpdateOutboundShipmentError::InvoiceIsNotEditable => {
                OutError::InvoiceIsNotEditable(InvoiceIsNotEditable {})
            }
            UpdateOutboundShipmentError::OtherPartyDoesNotExists => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::OtherPartyId))
            }
            UpdateOutboundShipmentError::OtherPartyNotACustomer(name) => {
                OutError::OtherPartyNotACustomer(OtherPartyNotACustomerError(NameNode { name }))
            }
            UpdateOutboundShipmentError::OtherPartyCannotBeThisStore => {
                OutError::OtherPartyCannotBeThisStore(OtherPartyCannotBeThisStoreError {})
            }
            UpdateOutboundShipmentError::InvoiceLineHasNoStockLine(id) => {
                OutError::InvalidInvoiceLine(InvoiceLineHasNoStockLineError(id))
            }
            UpdateOutboundShipmentError::NotAnOutboundShipment => {
                OutError::NotAnOutboundShipment(NotAnOutboundShipmentError {})
            }
            UpdateOutboundShipmentError::CannotChangeStatusOfInvoiceOnHold => {
                OutError::CannotChangeStatusOfInvoiceOnHold(CannotChangeStatusOfInvoiceOnHold {})
            }
            UpdateOutboundShipmentError::CanOnlyChangeToAllocatedWhenNoUnallocatedLines(lines) => {
                OutError::CanOnlyChangeToAllocatedWhenNoUnallocatedLines(
                    CanOnlyChangeToAllocatedWhenNoUnallocatedLines(InvoiceLineConnector::from_vec(
                        lines,
                    )),
                )
            }
        };

        UpdateOutboundShipmentResponse::Error(UpdateError { error })
    }
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
