use async_graphql::*;

use crate::schema::{
    mutations::{
        CannotEditInvoice, ForeignKey, ForeignKeyError, NotAnOutboundShipment, RecordAlreadyExist,
    },
    types::{
        get_invoice_line_response, DatabaseError, ErrorWrapper, InternalError, InvoiceLineNode,
        InvoiceLineResponse, NodeErrorInterface,
    },
};
use repository::StorageConnectionManager;
use service::invoice_line::{
    insert_outbound_shipment_service_line, InsertOutboundShipmentServiceLine,
    InsertOutboundShipmentServiceLineError,
};

use super::NotAServiceItem;

#[derive(InputObject)]
pub struct InsertOutboundShipmentServiceLineInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    name: Option<String>,
    total_after_tax: Option<f64>,
    note: Option<String>,
}

#[derive(Union)]
pub enum InsertOutboundShipmentServiceLineResponse {
    Error(ErrorWrapper<InsertOutboundShipmentServiceLineErrorInterface>),
    Response(InvoiceLineNode),
}

pub fn get_insert_outbound_shipment_service_line_response(
    connection_manager: &StorageConnectionManager,
    InsertOutboundShipmentServiceLineInput {
        id,
        invoice_id,
        item_id,
        name,
        total_after_tax,
        note,
    }: InsertOutboundShipmentServiceLineInput,
) -> InsertOutboundShipmentServiceLineResponse {
    use InsertOutboundShipmentServiceLineResponse::*;
    let id = match insert_outbound_shipment_service_line(
        connection_manager,
        InsertOutboundShipmentServiceLine {
            id,
            invoice_id,
            item_id,
            name,
            total_after_tax,
            note,
        },
    ) {
        Ok(id) => id,
        Err(error) => return error.into(),
    };
    match get_invoice_line_response(connection_manager, id) {
        InvoiceLineResponse::Response(node) => Response(node),
        InvoiceLineResponse::Error(err) => {
            let error = match err.error {
                NodeErrorInterface::DatabaseError(err) => {
                    InsertOutboundShipmentServiceLineErrorInterface::DatabaseError(err)
                }
                NodeErrorInterface::RecordNotFound(_) => {
                    InsertOutboundShipmentServiceLineErrorInterface::InternalError(InternalError(
                        "Inserted item went missing!".to_string(),
                    ))
                }
            };
            InsertOutboundShipmentServiceLineResponse::Error(ErrorWrapper { error })
        }
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertOutboundShipmentServiceLineErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    InternalError(InternalError),
    RecordAlreadyExist(RecordAlreadyExist),
    NotAnOutboundShipment(NotAnOutboundShipment),
    CannotEditInvoice(CannotEditInvoice),
    NotAServiceItem(NotAServiceItem),
}

impl From<InsertOutboundShipmentServiceLineError> for InsertOutboundShipmentServiceLineResponse {
    fn from(error: InsertOutboundShipmentServiceLineError) -> Self {
        use InsertOutboundShipmentServiceLineErrorInterface as OutError;
        let error = match error {
            InsertOutboundShipmentServiceLineError::LineAlreadyExists => {
                OutError::RecordAlreadyExist(RecordAlreadyExist {})
            }
            InsertOutboundShipmentServiceLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            InsertOutboundShipmentServiceLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            InsertOutboundShipmentServiceLineError::NotAnOutboundShipment => {
                OutError::NotAnOutboundShipment(NotAnOutboundShipment {})
            }
            InsertOutboundShipmentServiceLineError::CannotEditFinalised => {
                OutError::CannotEditInvoice(CannotEditInvoice {})
            }
            InsertOutboundShipmentServiceLineError::ItemNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::ItemId))
            }
            InsertOutboundShipmentServiceLineError::NotAServiceItem => {
                OutError::NotAServiceItem(NotAServiceItem)
            }
        };
        InsertOutboundShipmentServiceLineResponse::Error(ErrorWrapper { error })
    }
}
