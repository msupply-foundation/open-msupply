use async_graphql::*;

use crate::schema::{
    mutations::{
        outbound_shipment::NotAServiceItem, CannotEditInvoice, DeleteResponse, ForeignKey,
        ForeignKeyError, InvoiceDoesNotBelongToCurrentStore, InvoiceLineBelongsToAnotherInvoice,
        NotAnOutboundShipment,
    },
    types::{DatabaseError, ErrorWrapper, RecordNotFound},
};
use domain::outbound_shipment::DeleteOutboundShipmentLine;
use repository::StorageConnectionManager;
use service::invoice_line::{
    delete_outbound_shipment_service_line, DeleteOutboundShipmentServiceLineError,
};

#[derive(InputObject)]
pub struct DeleteOutboundShipmentServiceLineInput {
    pub id: String,
    pub invoice_id: String,
}

#[derive(Union)]
pub enum DeleteOutboundShipmentServiceLineResponse {
    Error(ErrorWrapper<DeleteOutboundShipmentServiceLineErrorInterface>),
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
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteOutboundShipmentServiceLineErrorInterface {
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
        use DeleteOutboundShipmentServiceLineErrorInterface as OutError;
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
            DeleteOutboundShipmentServiceLineError::NotThisInvoiceLine(invoice_id) => {
                OutError::InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice(
                    invoice_id,
                ))
            }
            DeleteOutboundShipmentServiceLineError::NotAServiceItem => {
                OutError::NotAServiceItem(NotAServiceItem)
            }
            DeleteOutboundShipmentServiceLineError::ItemNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::ItemId))
            }
        };

        DeleteOutboundShipmentServiceLineResponse::Error(ErrorWrapper { error })
    }
}
