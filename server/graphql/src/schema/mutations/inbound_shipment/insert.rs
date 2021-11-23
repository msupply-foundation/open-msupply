use async_graphql::*;

use crate::schema::{
    mutations::{ForeignKey, ForeignKeyError, RecordAlreadyExist},
    types::{
        get_invoice_response, DatabaseError, ErrorWrapper, InvoiceNodeStatus, InvoiceResponse,
        NameNode,
    },
};
use domain::inbound_shipment::InsertInboundShipment;
use repository::StorageConnectionManager;
use service::invoice::{insert_inbound_shipment, InsertInboundShipmentError};

use super::OtherPartyNotASupplier;

#[derive(InputObject)]
pub struct InsertInboundShipmentInput {
    pub id: String,
    pub other_party_id: String,
    pub status: InvoiceNodeStatus,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub color: Option<String>,
}

#[derive(Union)]
pub enum InsertInboundShipmentResponse {
    Error(ErrorWrapper<InsertInboundShipmentErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceResponse),
}

pub fn get_insert_inbound_shipment_response(
    connection_manager: &StorageConnectionManager,
    input: InsertInboundShipmentInput,
) -> InsertInboundShipmentResponse {
    use InsertInboundShipmentResponse::*;
    match insert_inbound_shipment(connection_manager, input.into()) {
        Ok(id) => Response(get_invoice_response(connection_manager, id)),
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertInboundShipmentErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordAlreadyExist(RecordAlreadyExist),
    OtherPartyNotASupplier(OtherPartyNotASupplier),
}

impl From<InsertInboundShipmentInput> for InsertInboundShipment {
    fn from(
        InsertInboundShipmentInput {
            id,
            other_party_id,
            status,
            on_hold,
            comment,
            their_reference,
            color,
        }: InsertInboundShipmentInput,
    ) -> Self {
        InsertInboundShipment {
            id,
            other_party_id,
            status: status.into(),
            on_hold,
            comment,
            their_reference,
            color,
        }
    }
}

impl From<InsertInboundShipmentError> for InsertInboundShipmentResponse {
    fn from(error: InsertInboundShipmentError) -> Self {
        use InsertInboundShipmentErrorInterface as OutError;
        let error = match error {
            InsertInboundShipmentError::InvoiceAlreadyExists => {
                OutError::RecordAlreadyExist(RecordAlreadyExist {})
            }
            InsertInboundShipmentError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            InsertInboundShipmentError::OtherPartyDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::OtherPartyId))
            }
            InsertInboundShipmentError::OtherPartyNotASupplier(name) => {
                OutError::OtherPartyNotASupplier(OtherPartyNotASupplier(NameNode { name }))
            }
        };

        InsertInboundShipmentResponse::Error(ErrorWrapper { error })
    }
}
