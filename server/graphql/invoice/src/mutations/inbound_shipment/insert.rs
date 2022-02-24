use crate::invoice_queries::{get_invoice, InvoiceResponse};

use async_graphql::*;

use graphql_core::simple_generic_errors::{
    DatabaseError, ForeignKey, ForeignKeyError, NodeError, RecordAlreadyExist,
};
use graphql_types::generic_errors::OtherPartyNotASupplier;
use graphql_types::types::{InvoiceNode, NameNode};
use repository::StorageConnectionManager;
use service::invoice::{insert_inbound_shipment, InsertInboundShipmentError, InsertInboundShipment};

#[derive(InputObject)]
pub struct InsertInboundShipmentInput {
    pub id: String,
    pub other_party_id: String,
    pub on_hold: Option<bool>,
    pub comment: Option<String>,
    pub their_reference: Option<String>,
    pub colour: Option<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertInboundShipmentError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
pub enum InsertInboundShipmentResponse {
    Error(InsertError),
    NodeError(NodeError),
    Response(InvoiceNode),
}

pub fn get_insert_inbound_shipment_response(
    connection_manager: &StorageConnectionManager,
    store_id: &str,
    input: InsertInboundShipmentInput,
) -> InsertInboundShipmentResponse {
    use InsertInboundShipmentResponse::*;
    let connection = match connection_manager.connection() {
        Ok(con) => con,
        Err(err) => {
            return InsertInboundShipmentResponse::Error(InsertError {
                error: InsertErrorInterface::DatabaseError(DatabaseError(err)),
            })
        }
    };
    match insert_inbound_shipment(&connection, store_id, input.into()) {
        Ok(id) => match get_invoice(connection_manager, None, id) {
            InvoiceResponse::Response(node) => Response(node),
            InvoiceResponse::Error(err) => NodeError(err),
        },
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(name = "InsertInboundShipmentErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
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
            on_hold,
            comment,
            their_reference,
            colour,
        }: InsertInboundShipmentInput,
    ) -> Self {
        InsertInboundShipment {
            id,
            other_party_id,
            on_hold,
            comment,
            their_reference,
            colour,
        }
    }
}

impl From<InsertInboundShipmentError> for InsertInboundShipmentResponse {
    fn from(error: InsertInboundShipmentError) -> Self {
        use InsertErrorInterface as OutError;
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

        InsertInboundShipmentResponse::Error(InsertError { error })
    }
}
