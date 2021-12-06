use async_graphql::*;

use super::{BatchIsReserved, InvoiceLineBelongsToAnotherInvoice};
use crate::schema::{
    mutations::{
        CannotEditInvoice, DeleteResponse, ForeignKey, ForeignKeyError,
        InvoiceDoesNotBelongToCurrentStore, NotAnInboundShipment,
    },
    types::{DatabaseError, ErrorWrapper, RecordNotFound},
};
use domain::inbound_shipment::DeleteInboundShipmentLine;
use repository::StorageConnectionManager;
use service::invoice_line::{delete_inbound_shipment_line, DeleteInboundShipmentLineError};

#[derive(InputObject)]
pub struct DeleteInboundShipmentLineInput {
    pub id: String,
    pub invoice_id: String,
}

#[derive(Union)]
pub enum DeleteInboundShipmentLineResponse {
    Error(ErrorWrapper<DeleteInboundShipmentLineErrorInterface>),
    Response(DeleteResponse),
}

pub fn get_delete_inbound_shipment_line_response(
    connection_manager: &StorageConnectionManager,
    input: DeleteInboundShipmentLineInput,
) -> DeleteInboundShipmentLineResponse {
    use DeleteInboundShipmentLineResponse::*;
    match delete_inbound_shipment_line(connection_manager, input.into()) {
        Ok(id) => Response(DeleteResponse(id)),
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteInboundShipmentLineErrorInterface {
    DatabaseError(DatabaseError),
    RecordNotFound(RecordNotFound),
    ForeignKeyError(ForeignKeyError),
    CannotEditInvoice(CannotEditInvoice),
    NotAnInboundShipment(NotAnInboundShipment),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    BatchIsReserved(BatchIsReserved),
}

impl From<DeleteInboundShipmentLineInput> for DeleteInboundShipmentLine {
    fn from(input: DeleteInboundShipmentLineInput) -> Self {
        DeleteInboundShipmentLine {
            id: input.id,
            invoice_id: input.invoice_id,
        }
    }
}

impl From<DeleteInboundShipmentLineError> for DeleteInboundShipmentLineResponse {
    fn from(error: DeleteInboundShipmentLineError) -> Self {
        use DeleteInboundShipmentLineErrorInterface as OutError;
        let error = match error {
            DeleteInboundShipmentLineError::LineDoesNotExist => {
                OutError::RecordNotFound(RecordNotFound {})
            }
            DeleteInboundShipmentLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            DeleteInboundShipmentLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            DeleteInboundShipmentLineError::NotAnInboundShipment => {
                OutError::NotAnInboundShipment(NotAnInboundShipment {})
            }
            DeleteInboundShipmentLineError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            DeleteInboundShipmentLineError::CannotEditFinalised => {
                OutError::CannotEditInvoice(CannotEditInvoice {})
            }

            DeleteInboundShipmentLineError::BatchIsReserved => {
                OutError::BatchIsReserved(BatchIsReserved {})
            }
            DeleteInboundShipmentLineError::NotThisInvoiceLine(invoice_id) => {
                OutError::InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice(
                    invoice_id,
                ))
            }
        };

        DeleteInboundShipmentLineResponse::Error(ErrorWrapper { error })
    }
}
