use crate::{
    server::service::graphql::schema::{
        mutations::{
            CannotDeleteInvoiceWithLines, CannotEditFinalisedInvoice, DeleteResponse,
            InvoiceDoesNotBelongToCurrentStore, NotAnOutboundShipment,
        },
        types::{DatabaseError, ErrorWrapper, RecordNotFound},
    },
    service::invoice::DeleteOutboundShipmentError,
};

use async_graphql::{Interface, Union};

#[derive(Union)]
pub enum DeleteOutboundShipmentResponse {
    Error(ErrorWrapper<DeleteOutboundShipmentErrorInterface>),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteOutboundShipmentErrorInterface {
    RecordNotFound(RecordNotFound),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotAnOutboundShipment(NotAnOutboundShipment),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
    DatabaseError(DatabaseError),
}

impl From<DeleteOutboundShipmentError> for DeleteOutboundShipmentResponse {
    fn from(error: DeleteOutboundShipmentError) -> Self {
        use DeleteOutboundShipmentErrorInterface as OutError;
        let error = match error {
            DeleteOutboundShipmentError::InvoiceDoesNotExist => {
                OutError::RecordNotFound(RecordNotFound {})
            }
            DeleteOutboundShipmentError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
            DeleteOutboundShipmentError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            DeleteOutboundShipmentError::InvoiceLinesExists(lines) => {
                OutError::CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines(lines.into()))
            }
            DeleteOutboundShipmentError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            DeleteOutboundShipmentError::NotAnOutboundShipment => {
                OutError::NotAnOutboundShipment(NotAnOutboundShipment {})
            }
        };

        DeleteOutboundShipmentResponse::Error(ErrorWrapper { error })
    }
}
