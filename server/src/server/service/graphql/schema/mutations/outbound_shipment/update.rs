use crate::{
    domain::{invoice::InvoiceStatus, outbound_shipment::UpdateOutboundShipment},
    server::service::graphql::schema::{
        mutations::{
            error::DatabaseError,
            outbound_shipment::{
                CannotChangeStatusOfInvoiceOnHold, InvoiceLineHasNoStockLineError,
                NotAnOutboundShipmentError,
            },
            ForeignKey, ForeignKeyError,
        },
        types::{ErrorWrapper, InvoiceNodeStatus, InvoiceResponse, NameNode, RecordNotFound},
    },
    service::invoice::UpdateOutboundShipmentError,
};

use super::{
    CanOnlyEditInvoicesInLoggedInStoreError, CannotChangeStatusBackToDraftError,
    FinalisedInvoiceIsNotEditableError, OtherPartyCannotBeThisStoreError,
    OtherPartyNotACustomerError,
};

use async_graphql::{InputObject, Interface, Union};

#[derive(InputObject)]
pub struct UpdateOutboundShipmentInput {
    /// The new invoice id provided by the client
    id: String,
    /// The other party must be a customer of the current store.
    /// This field can be used to change the other_party of an invoice
    other_party_id: Option<String>,
    /// When changing the status from DRAFT to CONFIRMED or FINALISED the total_number_of_packs for
    /// existing invoice items gets updated.
    status: Option<InvoiceNodeStatus>,
    on_hold: Option<bool>,
    comment: Option<String>,
    /// External invoice reference, e.g. purchase or shipment number
    their_reference: Option<String>,
}

impl From<UpdateOutboundShipmentInput> for UpdateOutboundShipment {
    fn from(input: UpdateOutboundShipmentInput) -> Self {
        UpdateOutboundShipment {
            id: input.id,
            other_party_id: input.other_party_id,
            status: input.status.map(InvoiceStatus::from),
            on_hold: input.on_hold,
            comment: input.comment,
            their_reference: input.their_reference,
        }
    }
}

#[derive(Union)]
pub enum UpdateOutboundShipmentResponse {
    Error(ErrorWrapper<UpdateOutboundShipmentErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum UpdateOutboundShipmentErrorInterface {
    CannotChangeInvoiceBackToDraft(CannotChangeStatusBackToDraftError),
    CannotChangeStatusOfInvoiceOnHold(CannotChangeStatusOfInvoiceOnHold),
    CanOnlyEditInvoicesInLoggedInStore(CanOnlyEditInvoicesInLoggedInStoreError),
    InvoiceIsFinalised(FinalisedInvoiceIsNotEditableError),
    InvoiceDoesNotExists(RecordNotFound),
    OtherPartyCannotBeThisStore(OtherPartyCannotBeThisStoreError),
    /// Other party does not exist
    ForeignKeyError(ForeignKeyError),
    OtherPartyNotACustomer(OtherPartyNotACustomerError),
    NotAnOutboundShipment(NotAnOutboundShipmentError),
    DatabaseError(DatabaseError),
    InvalidInvoiceLine(InvoiceLineHasNoStockLineError),
}

impl From<UpdateOutboundShipmentError> for UpdateOutboundShipmentResponse {
    fn from(error: UpdateOutboundShipmentError) -> Self {
        use UpdateOutboundShipmentErrorInterface as OutError;
        let error = match error {
            UpdateOutboundShipmentError::CannotChangeInvoiceBackToDraft => {
                OutError::CannotChangeInvoiceBackToDraft(CannotChangeStatusBackToDraftError {})
            }
            UpdateOutboundShipmentError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            UpdateOutboundShipmentError::InvoiceDoesNotExists => {
                OutError::InvoiceDoesNotExists(RecordNotFound {})
            }
            UpdateOutboundShipmentError::InvoiceIsFinalised => {
                OutError::InvoiceIsFinalised(FinalisedInvoiceIsNotEditableError {})
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
        };

        UpdateOutboundShipmentResponse::Error(ErrorWrapper { error })
    }
}
