use async_graphql::*;

use crate::{
    domain::inbound_shipment::InsertInboundShipment,
    server::service::graphql::schema::{
        mutations::{ForeignKey, ForeignKeyError, RecordAlreadyExist},
        types::{DatabaseError, ErrorWrapper, InvoiceNodeStatus, InvoiceResponse, NameNode},
    },
    service::invoice::InsertInboundShipmentError,
};

use super::OtherPartyNotASupplier;

#[derive(InputObject)]
pub struct InsertInboundShipmentInput {
    pub id: String,
    pub other_party_id: String,
    pub status: InvoiceNodeStatus,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
}

#[derive(Union)]
pub enum InsertInboundShipmentResponse {
    Error(ErrorWrapper<InsertInboundShipmentErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceResponse),
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
            comment,
            their_reference,
        }: InsertInboundShipmentInput,
    ) -> Self {
        InsertInboundShipment {
            id,
            other_party_id,
            status: status.into(),
            comment,
            their_reference,
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
