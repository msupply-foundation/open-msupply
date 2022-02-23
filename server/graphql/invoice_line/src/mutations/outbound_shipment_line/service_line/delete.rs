use async_graphql::*;

use domain::outbound_shipment::DeleteOutboundShipmentLine;
use graphql_core::simple_generic_errors::{
    CannotEditInvoice, DatabaseError, ForeignKey, ForeignKeyError,
    InvoiceDoesNotBelongToCurrentStore, InvoiceLineBelongsToAnotherInvoice, NotAnOutboundShipment,
    RecordNotFound,
};
use graphql_types::types::{
    DeleteResponse,
};
use repository::StorageConnectionManager;
use service::invoice_line::{
    delete_outbound_shipment_service_line, DeleteOutboundShipmentServiceLineError,
};

use super::NotAServiceItem;

#[derive(InputObject)]
pub struct DeleteOutboundShipmentServiceLineInput {
    pub id: String,
    pub invoice_id: String,
}

#[derive(SimpleObject)]
#[graphql(name = "DeleteOutboundShipmentServiceLineError")]
pub struct DeleteError {
    pub error: DeleteErrorInterface,
}

#[derive(Union)]
pub enum DeleteOutboundShipmentServiceLineResponse {
    Error(DeleteError),
    Response(DeleteResponse),
}

pub fn get_delete_outbound_shipment_service_line_response(
    connection_manager: &StorageConnectionManager,
    input: DeleteOutboundShipmentServiceLineInput,
) -> DeleteOutboundShipmentServiceLineResponse {
    use DeleteOutboundShipmentServiceLineResponse::*;
    match delete_outbound_shipment_service_line(
        connection_manager,
        DeleteOutboundShipmentLine {
            id: input.id,
            invoice_id: input.invoice_id,
        },
    ) {
        Ok(id) => Response(DeleteResponse(id)),
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(name = "DeleteOutboundShipmentServiceLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteErrorInterface {
    DatabaseError(DatabaseError),
    RecordNotFound(RecordNotFound),
    ForeignKeyError(ForeignKeyError),
    NotAnOutboundShipment(NotAnOutboundShipment),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    CannotEditInvoice(CannotEditInvoice),
    NotAServiceItem(NotAServiceItem),
}

impl From<DeleteOutboundShipmentServiceLineError> for DeleteOutboundShipmentServiceLineResponse {
    fn from(error: DeleteOutboundShipmentServiceLineError) -> Self {
        use DeleteErrorInterface as OutError;
        let error = match error {
            DeleteOutboundShipmentServiceLineError::LineDoesNotExist => {
                OutError::RecordNotFound(RecordNotFound {})
            }
            DeleteOutboundShipmentServiceLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            DeleteOutboundShipmentServiceLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            DeleteOutboundShipmentServiceLineError::NotAnOutboundShipment => {
                OutError::NotAnOutboundShipment(NotAnOutboundShipment {})
            }
            DeleteOutboundShipmentServiceLineError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            DeleteOutboundShipmentServiceLineError::CannotEditFinalised => {
                OutError::CannotEditInvoice(CannotEditInvoice {})
            }
            DeleteOutboundShipmentServiceLineError::NotThisInvoiceLine(_invoice_id) => {
                OutError::InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice {})
            }
            DeleteOutboundShipmentServiceLineError::NotAServiceItem => {
                OutError::NotAServiceItem(NotAServiceItem)
            }
            DeleteOutboundShipmentServiceLineError::ItemNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::ItemId))
            }
        };

        DeleteOutboundShipmentServiceLineResponse::Error(DeleteError { error })
    }
}
