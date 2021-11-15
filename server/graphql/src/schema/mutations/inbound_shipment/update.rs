use async_graphql::*;

use crate::schema::{
    mutations::{
        outbound_shipment::CannotChangeStatusOfInvoiceOnHold, CannotChangeInvoiceBackToDraft,
        CannotEditFinalisedInvoice, ForeignKey, ForeignKeyError,
        InvoiceDoesNotBelongToCurrentStore, NotAnInboundShipment,
    },
    types::{
        get_invoice_response, DatabaseError, ErrorWrapper, InvoiceNodeStatus, InvoiceResponse,
        NameNode, RecordNotFound,
    },
};
use domain::{inbound_shipment::UpdateInboundShipment, invoice::InvoiceStatus};
use repository::StorageConnectionManager;
use service::invoice::{update_inbound_shipment, UpdateInboundShipmentError};

use super::OtherPartyNotASupplier;

#[derive(InputObject)]
pub struct UpdateInboundShipmentInput {
    pub id: String,
    pub other_party_id: Option<String>,
    pub status: Option<InvoiceNodeStatus>,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
}

#[derive(Union)]
pub enum UpdateInboundShipmentResponse {
    Error(ErrorWrapper<UpdateInboundShipmentErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceResponse),
}

pub fn get_update_inbound_shipment_response(
    connection_manager: &StorageConnectionManager,
    input: UpdateInboundShipmentInput,
) -> UpdateInboundShipmentResponse {
    use UpdateInboundShipmentResponse::*;
    match update_inbound_shipment(connection_manager, input.into()) {
        Ok(id) => Response(get_invoice_response(connection_manager, id)),
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateInboundShipmentErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordNotFound(RecordNotFound),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotAnInboundShipment(NotAnInboundShipment),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    CannotChangeInvoiceBackToDraft(CannotChangeInvoiceBackToDraft),
    CannotChangeStatusOfInvoiceOnHold(CannotChangeStatusOfInvoiceOnHold),
}

impl From<UpdateInboundShipmentInput> for UpdateInboundShipment {
    fn from(
        UpdateInboundShipmentInput {
            id,
            other_party_id,
            status,
            on_hold,
            comment,
            their_reference,
        }: UpdateInboundShipmentInput,
    ) -> Self {
        UpdateInboundShipment {
            id,
            other_party_id,
            status: status.map(InvoiceStatus::from),
            on_hold,
            comment,
            their_reference,
        }
    }
}

impl From<UpdateInboundShipmentError> for UpdateInboundShipmentResponse {
    fn from(error: UpdateInboundShipmentError) -> Self {
        use UpdateInboundShipmentErrorInterface as OutError;
        let error = match error {
            UpdateInboundShipmentError::InvoiceDoesNotExist => {
                OutError::RecordNotFound(RecordNotFound {})
            }
            UpdateInboundShipmentError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            UpdateInboundShipmentError::OtherPartyDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::OtherPartyId))
            }
            UpdateInboundShipmentError::OtherPartyNotASupplier(name) => {
                OutError::OtherPartyNotASupplier(OtherPartyNotASupplier(NameNode { name }))
            }
            UpdateInboundShipmentError::NotAnInboundShipment => {
                OutError::NotAnInboundShipment(NotAnInboundShipment {})
            }
            UpdateInboundShipmentError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            UpdateInboundShipmentError::CannotChangeInvoiceBackToDraft => {
                OutError::CannotChangeInvoiceBackToDraft(CannotChangeInvoiceBackToDraft {})
            }
            UpdateInboundShipmentError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
            UpdateInboundShipmentError::CannotChangeStatusOfInvoiceOnHold => {
                OutError::CannotChangeStatusOfInvoiceOnHold(CannotChangeStatusOfInvoiceOnHold {})
            }
        };

        UpdateInboundShipmentResponse::Error(ErrorWrapper { error })
    }
}
