use crate::mutations::outbound_shipment::CannotChangeStatusOfInvoiceOnHold;
use async_graphql::*;
use domain::inbound_shipment::{
    DeleteInboundShipment, InsertInboundShipment, UpdateInboundShipment,
    UpdateInboundShipmentStatus,
};
use domain::{invoice::InvoiceStatus, outbound_shipment::InsertOutboundShipment};
use graphql_core::simple_generic_errors::{
    CannotEditInvoice, InvoiceDoesNotBelongToCurrentStore, NotAnInboundShipment,
};
use graphql_core::{
    simple_generic_errors::{
        CannotReverseInvoiceStatus, DatabaseError, ForeignKey, ForeignKeyError, NodeError,
        NodeErrorInterface, RecordAlreadyExist, RecordNotFound,
    },
    ContextExt,
};
use graphql_types::generic_errors::{CannotDeleteInvoiceWithLines, OtherPartyNotASupplier};
use graphql_types::types::{
    GenericDeleteResponse, InvoiceLineConnector, InvoiceNode, InvoiceNodeStatus, InvoiceNodeType,
    NameNode,
};
use repository::StorageConnectionManager;
use service::invoice::{
    delete_inbound_shipment, insert_inbound_shipment, insert_outbound_shipment,
    DeleteInboundShipmentError, InsertInboundShipmentError, InsertOutboundShipmentError,
};
use service::invoice::{update_inbound_shipment, UpdateInboundShipmentError};

#[derive(InputObject)]
pub struct DeleteInboundShipmentInput {
    pub id: String,
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteInboundShipmentError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
pub enum DeleteInboundShipmentResponse {
    Error(DeleteError),
    Response(GenericDeleteResponse),
}

pub fn get_delete_inbound_shipment_response(
    connection_manager: &StorageConnectionManager,
    input: DeleteInboundShipmentInput,
) -> DeleteInboundShipmentResponse {
    use DeleteInboundShipmentResponse::*;
    match delete_inbound_shipment(connection_manager, input.into()) {
        Ok(id) => Response(GenericDeleteResponse(id)),
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(name = "DeleteInboundShipmentErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteErrorInterface {
    DatabaseError(DatabaseError),
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    NotAnInboundShipment(NotAnInboundShipment),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
}

impl From<DeleteInboundShipmentInput> for DeleteInboundShipment {
    fn from(input: DeleteInboundShipmentInput) -> Self {
        DeleteInboundShipment { id: input.id }
    }
}

impl From<DeleteInboundShipmentError> for DeleteInboundShipmentResponse {
    fn from(error: DeleteInboundShipmentError) -> Self {
        use DeleteErrorInterface as OutError;
        let error = match error {
            DeleteInboundShipmentError::InvoiceDoesNotExist => {
                OutError::RecordNotFound(RecordNotFound {})
            }
            DeleteInboundShipmentError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }

            DeleteInboundShipmentError::NotAnInboundShipment => {
                OutError::NotAnInboundShipment(NotAnInboundShipment {})
            }
            DeleteInboundShipmentError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            DeleteInboundShipmentError::CannotEditFinalised => {
                OutError::CannotEditInvoice(CannotEditInvoice {})
            }
            DeleteInboundShipmentError::InvoiceLinesExists(lines) => {
                OutError::CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines(
                    InvoiceLineConnector::from_vec(lines),
                ))
            }
        };

        DeleteInboundShipmentResponse::Error(DeleteError { error })
    }
}
