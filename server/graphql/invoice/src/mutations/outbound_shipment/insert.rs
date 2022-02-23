use super::{OtherPartyCannotBeThisStoreError, OtherPartyNotACustomerError};
use crate::invoice_queries::{get_invoice, InvoiceResponse};
use async_graphql::*;
use domain::{invoice::InvoiceStatus, outbound_shipment::InsertOutboundShipment};
use graphql_core::{
    simple_generic_errors::{
        DatabaseError, ForeignKey, ForeignKeyError, NodeError, RecordAlreadyExist,
    },
};
use graphql_types::types::{
    InvoiceNode, InvoiceNodeStatus, NameNode,
};
use repository::StorageConnectionManager;
use service::invoice::{insert_outbound_shipment, InsertOutboundShipmentError};

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
    colour: Option<String>,
}

impl From<InsertOutboundShipmentInput> for InsertOutboundShipment {
    fn from(input: InsertOutboundShipmentInput) -> Self {
        InsertOutboundShipment {
            id: input.id,
            other_party_id: input.other_party_id,
            status: input
                .status
                .map(|s| s.to_domain())
                .unwrap_or(InvoiceStatus::New),
            on_hold: input.on_hold,
            comment: input.comment,
            their_reference: input.their_reference,
            colour: input.colour,
        }
    }
}

#[derive(SimpleObject)]
#[graphql(name = "InsertOutboundShipmentError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
pub enum InsertOutboundShipmentResponse {
    Error(InsertError),
    NodeError(NodeError),
    Response(InvoiceNode),
}

pub fn get_insert_outbound_shipment_response(
    connection_manager: &StorageConnectionManager,
    store_id: &str,
    input: InsertOutboundShipmentInput,
) -> InsertOutboundShipmentResponse {
    use InsertOutboundShipmentResponse::*;
    let connection = match connection_manager.connection() {
        Ok(con) => con,
        Err(err) => {
            return InsertOutboundShipmentResponse::Error(InsertError {
                error: InsertErrorInterface::DatabaseError(DatabaseError(err)),
            })
        }
    };
    match insert_outbound_shipment(&connection, store_id, input.into()) {
        Ok(id) => match get_invoice(connection_manager, None, id) {
            InvoiceResponse::Response(node) => Response(node),
            InvoiceResponse::Error(err) => NodeError(err),
        },
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "String"))]
pub enum InsertErrorInterface {
    InvoiceAlreadyExists(RecordAlreadyExist),
    ForeignKeyError(ForeignKeyError),
    OtherPartyCannotBeThisStore(OtherPartyCannotBeThisStoreError),
    OtherPartyNotACustomer(OtherPartyNotACustomerError),
    DatabaseError(DatabaseError),
}

impl From<InsertOutboundShipmentError> for InsertOutboundShipmentResponse {
    fn from(error: InsertOutboundShipmentError) -> Self {
        use InsertErrorInterface as OutError;
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

        InsertOutboundShipmentResponse::Error(InsertError { error })
    }
}
