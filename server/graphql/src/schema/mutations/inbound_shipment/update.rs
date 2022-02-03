use async_graphql::*;

use crate::schema::{
    mutations::{
        outbound_shipment::CannotChangeStatusOfInvoiceOnHold, CannotEditInvoice,
        CannotReverseInvoiceStatus, ForeignKey, ForeignKeyError,
        InvoiceDoesNotBelongToCurrentStore, NotAnInboundShipment,
    },
    queries::invoice::*,
    types::{DatabaseError, ErrorWrapper, InvoiceNode, NameNode, NodeError, RecordNotFound},
};
use domain::inbound_shipment::{UpdateInboundShipment, UpdateInboundShipmentStatus};
use repository::StorageConnectionManager;
use service::invoice::{update_inbound_shipment, UpdateInboundShipmentError};

use super::OtherPartyNotASupplier;

#[derive(InputObject)]
pub struct UpdateInboundShipmentInput {
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

impl UpdateInboundShipmentStatusInput {
    pub fn to_domain(&self) -> UpdateInboundShipmentStatus {
        use UpdateInboundShipmentStatus::*;
        match self {
            UpdateInboundShipmentStatusInput::Delivered => Delivered,
            UpdateInboundShipmentStatusInput::Verified => Verified,
        }
    }
}

#[derive(Union)]
pub enum UpdateInboundShipmentResponse {
    Error(ErrorWrapper<UpdateInboundShipmentErrorInterface>),
    NodeError(NodeError),
    Response(InvoiceNode),
}

pub fn get_update_inbound_shipment_response(
    connection_manager: &StorageConnectionManager,
    input: UpdateInboundShipmentInput,
) -> UpdateInboundShipmentResponse {
    use UpdateInboundShipmentResponse::*;
    let connection = match connection_manager.connection() {
        Ok(con) => con,
        Err(err) => {
            return UpdateInboundShipmentResponse::Error(ErrorWrapper {
                error: UpdateInboundShipmentErrorInterface::DatabaseError(DatabaseError(err)),
            })
        }
    };
    match update_inbound_shipment(&connection, input.into()) {
        Ok(id) => match get_invoice(connection_manager, None, id) {
            InvoiceResponse::Response(node) => Response(node),
            InvoiceResponse::Error(err) => NodeError(err),
        },
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
    CannotEditInvoice(CannotEditInvoice),
    NotAnInboundShipment(NotAnInboundShipment),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    CannotReverseInvoiceStatus(CannotReverseInvoiceStatus),
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
            colour,
        }: UpdateInboundShipmentInput,
    ) -> Self {
        UpdateInboundShipment {
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
            UpdateInboundShipmentError::CannotReverseInvoiceStatus => {
                OutError::CannotReverseInvoiceStatus(CannotReverseInvoiceStatus {})
            }
            UpdateInboundShipmentError::CannotEditFinalised => {
                OutError::CannotEditInvoice(CannotEditInvoice {})
            }
            UpdateInboundShipmentError::CannotChangeStatusOfInvoiceOnHold => {
                OutError::CannotChangeStatusOfInvoiceOnHold(CannotChangeStatusOfInvoiceOnHold {})
            }
        };

        UpdateInboundShipmentResponse::Error(ErrorWrapper { error })
    }
}
