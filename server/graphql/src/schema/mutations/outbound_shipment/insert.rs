use crate::schema::{
    mutations::{ForeignKey, ForeignKeyError, RecordAlreadyExist},
    queries::invoice::{self, InvoiceResponse},
    types::{DatabaseError, ErrorWrapper, InvoiceNode, InvoiceNodeStatus, NameNode, NodeError},
};
use domain::{invoice::InvoiceStatus, outbound_shipment::InsertOutboundShipment};
use repository::StorageConnectionManager;
use service::invoice::{insert_outbound_shipment, InsertOutboundShipmentError};

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
    color: Option<String>,
}

impl From<InsertOutboundShipmentInput> for InsertOutboundShipment {
    fn from(input: InsertOutboundShipmentInput) -> Self {
        InsertOutboundShipment {
            id: input.id,
            other_party_id: input.other_party_id,
            status: input.status.map(|s| s.into()).unwrap_or(InvoiceStatus::New),
            on_hold: input.on_hold,
            comment: input.comment,
            their_reference: input.their_reference,
            color: input.color,
        }
    }
}

#[derive(Union)]
pub enum InsertOutboundShipmentResponse {
    Error(ErrorWrapper<InsertOutboundShipmentErrorInterface>),
    NodeError(NodeError),
    Response(InvoiceNode),
}

pub fn get_insert_outbound_shipment_response(
    connection_manager: &StorageConnectionManager,
    input: InsertOutboundShipmentInput,
) -> InsertOutboundShipmentResponse {
    use InsertOutboundShipmentResponse::*;
    let connection = match connection_manager.connection() {
        Ok(con) => con,
        Err(err) => {
            return InsertOutboundShipmentResponse::Error(ErrorWrapper {
                error: InsertOutboundShipmentErrorInterface::DatabaseError(DatabaseError(err)),
            })
        }
    };
    match insert_outbound_shipment(&connection, input.into()) {
        Ok(id) => match invoice::get(connection_manager, id) {
            InvoiceResponse::Response(node) => Response(node),
            InvoiceResponse::Error(err) => NodeError(err),
        },
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
