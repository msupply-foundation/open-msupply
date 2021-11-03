use crate::{
    database::repository::StorageConnectionManager,
    domain::{invoice::InvoiceStatus, outbound_shipment::InsertOutboundShipment},
    server::service::graphql::schema::{
        mutations::{ForeignKey, ForeignKeyError, RecordAlreadyExist},
        types::{
            get_invoice_response, DatabaseError, ErrorWrapper, InvoiceNodeStatus, InvoiceResponse,
            NameNode,
        },
    },
    service::invoice::{insert_outbound_shipment, InsertOutboundShipmentError},
};

use super::{OtherPartyCannotBeThisStoreError, OtherPartyNotACustomerError};

use async_graphql::{InputObject, Interface, Union};

#[derive(InputObject)]
pub struct InsertOutboundShipmentInput {
    /// The new invoice id provided by the client
    pub id: String,
    /// The other party must be an customer of the current store
    other_party_id: String,
    status: Option<InvoiceNodeStatus>,
    on_hold: Option<bool>,
    comment: Option<String>,
    their_reference: Option<String>,
}

impl From<InsertOutboundShipmentInput> for InsertOutboundShipment {
    fn from(input: InsertOutboundShipmentInput) -> Self {
        InsertOutboundShipment {
            id: input.id,
            other_party_id: input.other_party_id,
            status: input
                .status
                .map(|s| s.into())
                .unwrap_or(InvoiceStatus::Draft),
            on_hold: input.on_hold,
            comment: input.comment,
            their_reference: input.their_reference,
        }
    }
}

#[derive(Union)]
pub enum InsertOutboundShipmentResponse {
    Error(ErrorWrapper<InsertOutboundShipmentErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceResponse),
}

pub fn get_insert_outbound_shipment_response(
    connection_manager: &StorageConnectionManager,
    input: InsertOutboundShipmentInput,
) -> InsertOutboundShipmentResponse {
    use InsertOutboundShipmentResponse::*;
    match insert_outbound_shipment(connection_manager, input.into()) {
        Ok(id) => Response(get_invoice_response(connection_manager, id)),
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertOutboundShipmentErrorInterface {
    InvoiceAlreadyExists(RecordAlreadyExist),
    ForeignKeyError(ForeignKeyError),
    OtherPartyCannotBeThisStore(OtherPartyCannotBeThisStoreError),
    OtherPartyNotACustomer(OtherPartyNotACustomerError),
    DatabaseError(DatabaseError),
}

impl From<InsertOutboundShipmentError> for InsertOutboundShipmentResponse {
    fn from(error: InsertOutboundShipmentError) -> Self {
        use InsertOutboundShipmentErrorInterface as OutError;
        let error = match error {
            InsertOutboundShipmentError::OtherPartyCannotBeThisStore => {
                OutError::OtherPartyCannotBeThisStore(OtherPartyCannotBeThisStoreError {})
            }
            InsertOutboundShipmentError::OtherPartyIdNotFound(_) => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::OtherPartyId))
            }
            InsertOutboundShipmentError::OtherPartyNotACustomer(name) => {
                OutError::OtherPartyNotACustomer(OtherPartyNotACustomerError(NameNode { name }))
            }
            InsertOutboundShipmentError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            InsertOutboundShipmentError::InvoiceAlreadyExists => {
                OutError::InvoiceAlreadyExists(RecordAlreadyExist {})
            }
        };

        InsertOutboundShipmentResponse::Error(ErrorWrapper { error })
    }
}
