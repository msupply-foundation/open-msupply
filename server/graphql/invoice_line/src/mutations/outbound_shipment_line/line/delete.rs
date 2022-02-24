use async_graphql::*;
use graphql_core::simple_generic_errors::{
    CannotEditInvoice, DatabaseError, ForeignKey, ForeignKeyError,
    InvoiceDoesNotBelongToCurrentStore, InvoiceLineBelongsToAnotherInvoice, NotAnOutboundShipment,
    RecordNotFound,
};
use graphql_types::types::DeleteResponse;
use repository::StorageConnectionManager;
use service::invoice_line::{
    delete_outbound_shipment_line, DeleteOutboundShipmentLine, DeleteOutboundShipmentLineError,
};

#[derive(InputObject)]
pub struct DeleteOutboundShipmentLineInput {
    pub id: String,
    pub invoice_id: String,
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteOutboundShipmentLineError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
pub enum DeleteOutboundShipmentLineResponse {
    Error(DeleteError),
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
#[graphql(name = "DeleteOutboundShipmentLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteErrorInterface {
    DatabaseError(DatabaseError),
    RecordNotFound(RecordNotFound),
    ForeignKeyError(ForeignKeyError),
    CannotEditInvoice(CannotEditInvoice),
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
        use DeleteErrorInterface as OutError;
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
                OutError::CannotEditInvoice(CannotEditInvoice {})
            }
            DeleteOutboundShipmentLineError::NotThisInvoiceLine(_invoice_id) => {
                OutError::InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice {})
            }
        };

        DeleteOutboundShipmentLineResponse::Error(DeleteError { error })
    }
}
