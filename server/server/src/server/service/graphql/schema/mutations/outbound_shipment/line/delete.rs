use async_graphql::*;

use crate::{
    server::service::graphql::schema::{
        mutations::{
            CannotEditFinalisedInvoice, DeleteResponse, ForeignKey, ForeignKeyError,
            InvoiceDoesNotBelongToCurrentStore, InvoiceLineBelongsToAnotherInvoice,
            NotAnOutboundShipment,
        },
        types::{DatabaseError, ErrorWrapper, RecordNotFound},
    },
    service::invoice_line::{delete_outbound_shipment_line, DeleteOutboundShipmentLineError},
};
use domain::outbound_shipment::DeleteOutboundShipmentLine;
use repository::repository::StorageConnectionManager;

#[derive(InputObject)]
pub struct DeleteOutboundShipmentLineInput {
    pub id: String,
    pub invoice_id: String,
}

#[derive(Union)]
pub enum DeleteOutboundShipmentLineResponse {
    Error(ErrorWrapper<DeleteOutboundShipmentLineErrorInterface>),
    Response(DeleteResponse),
}

pub fn get_delete_outbound_shipment_line_response(
    connection_manager: &StorageConnectionManager,
    input: DeleteOutboundShipmentLineInput,
) -> DeleteOutboundShipmentLineResponse {
    use DeleteOutboundShipmentLineResponse::*;
    match delete_outbound_shipment_line(connection_manager, input.into()) {
        Ok(id) => Response(DeleteResponse(id)),
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteOutboundShipmentLineErrorInterface {
    DatabaseError(DatabaseError),
    RecordNotFound(RecordNotFound),
    ForeignKeyError(ForeignKeyError),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotAnOutboundShipment(NotAnOutboundShipment),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
}

impl From<DeleteOutboundShipmentLineInput> for DeleteOutboundShipmentLine {
    fn from(input: DeleteOutboundShipmentLineInput) -> Self {
        DeleteOutboundShipmentLine {
            id: input.id,
            invoice_id: input.invoice_id,
        }
    }
}

impl From<DeleteOutboundShipmentLineError> for DeleteOutboundShipmentLineResponse {
    fn from(error: DeleteOutboundShipmentLineError) -> Self {
        use DeleteOutboundShipmentLineErrorInterface as OutError;
        let error = match error {
            DeleteOutboundShipmentLineError::LineDoesNotExist => {
                OutError::RecordNotFound(RecordNotFound {})
            }
            DeleteOutboundShipmentLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            DeleteOutboundShipmentLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            DeleteOutboundShipmentLineError::NotAnOutboundShipment => {
                OutError::NotAnOutboundShipment(NotAnOutboundShipment {})
            }
            DeleteOutboundShipmentLineError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            DeleteOutboundShipmentLineError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
            DeleteOutboundShipmentLineError::NotThisInvoiceLine(invoice_id) => {
                OutError::InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice(
                    invoice_id,
                ))
            }
        };

        DeleteOutboundShipmentLineResponse::Error(ErrorWrapper { error })
    }
}
