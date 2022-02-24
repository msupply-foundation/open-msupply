use async_graphql::*;

use graphql_core::simple_generic_errors::{
    CannotEditInvoice, InvoiceDoesNotBelongToCurrentStore, NotAnInboundShipment,
};
use graphql_core::simple_generic_errors::{DatabaseError, RecordNotFound};
use graphql_types::generic_errors::CannotDeleteInvoiceWithLines;
use graphql_types::types::{DeleteResponse, InvoiceLineConnector};
use repository::StorageConnectionManager;
use service::invoice::{delete_inbound_shipment, DeleteInboundShipmentError, DeleteInboundShipment};

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
    Response(DeleteResponse),
}

pub fn get_delete_inbound_shipment_response(
    connection_manager: &StorageConnectionManager,
    input: DeleteInboundShipmentInput,
) -> DeleteInboundShipmentResponse {
    use DeleteInboundShipmentResponse::*;
    match delete_inbound_shipment(connection_manager, input.into()) {
        Ok(id) => Response(DeleteResponse(id)),
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
