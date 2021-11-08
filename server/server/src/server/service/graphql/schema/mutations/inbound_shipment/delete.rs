use async_graphql::*;

use crate::{
    database::repository::StorageConnectionManager,
    server::service::graphql::schema::{
        mutations::{
            CannotDeleteInvoiceWithLines, CannotEditFinalisedInvoice, DeleteResponse,
            InvoiceDoesNotBelongToCurrentStore, NotAnInboundShipment,
        },
        types::{DatabaseError, ErrorWrapper, RecordNotFound},
    },
    service::invoice::{delete_inbound_shipment, DeleteInboundShipmentError},
};
use domain::inbound_shipment::DeleteInboundShipment;

#[derive(InputObject)]
pub struct DeleteInboundShipmentInput {
    pub id: String,
}

#[derive(Union)]
pub enum DeleteInboundShipmentResponse {
    Error(ErrorWrapper<DeleteInboundShipmentErrorInterface>),
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
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteInboundShipmentErrorInterface {
    DatabaseError(DatabaseError),
    RecordNotFound(RecordNotFound),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
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
        use DeleteInboundShipmentErrorInterface as OutError;
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
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
            DeleteInboundShipmentError::InvoiceLinesExists(lines) => {
                OutError::CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines(lines.into()))
            }
        };

        DeleteInboundShipmentResponse::Error(ErrorWrapper { error })
    }
}
