use async_graphql::*;

use graphql_core::simple_generic_errors::{
    CannotEditInvoice, DatabaseError, ForeignKey, ForeignKeyError, InternalError,
    NodeErrorInterface, NotAnOutboundShipment,
    RecordAlreadyExist,
};
use graphql_types::types::{
    get_invoice_line_response, InvoiceLineNode, InvoiceLineResponse,
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
    total_before_tax: f64,
    total_after_tax: f64,
    tax: Option<f64>,
    note: Option<String>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertOutboundShipmentServiceLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
pub enum InsertOutboundShipmentServiceLineResponse {
    Error(InsertError),
    Response(InvoiceLineNode),
}

pub fn get_insert_outbound_shipment_service_line_response(
    connection_manager: &StorageConnectionManager,
    InsertOutboundShipmentServiceLineInput {
        id,
        invoice_id,
        item_id,
        name,
        total_before_tax,
        total_after_tax,
        tax,
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
            total_before_tax,
            total_after_tax,
            tax,
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
                NodeErrorInterface::DatabaseError(err) => InsertErrorInterface::DatabaseError(err),
                NodeErrorInterface::RecordNotFound(_) => InsertErrorInterface::InternalError(
                    InternalError("Inserted item went missing!".to_string()),
                ),
            };
            InsertOutboundShipmentServiceLineResponse::Error(InsertError { error })
        }
    }
}

#[derive(Interface)]
#[graphql(name = "InsertOutboundShipmentServiceLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
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
        use InsertErrorInterface as OutError;
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
        InsertOutboundShipmentServiceLineResponse::Error(InsertError { error })
    }
}
