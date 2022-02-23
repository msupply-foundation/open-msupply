use async_graphql::*;
use chrono::NaiveDate;

use crate::schema::{
    mutations::{
        CannotEditInvoice, ForeignKey, ForeignKeyError, InvoiceDoesNotBelongToCurrentStore,
        NotAnInboundShipment, RecordAlreadyExist,
    },
    types::{
        get_invoice_line_response, DatabaseError, InvoiceLineNode, InvoiceLineResponse, NodeError,
        Range, RangeError, RangeField,
    },
};
use domain::inbound_shipment::InsertInboundShipmentLine;
use repository::StorageConnectionManager;
use service::invoice_line::{insert_inbound_shipment_line, InsertInboundShipmentLineError};

#[derive(InputObject)]
pub struct InsertInboundShipmentLineInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub pack_size: u32,
    pub batch: Option<String>,
    pub location_id: Option<String>,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: u32,
    pub total_before_tax: f64,
    pub total_after_tax: f64,
    pub tax: Option<f64>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertInboundShipmentLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
pub enum InsertInboundShipmentLineResponse {
    Error(InsertError),
    NodeError(NodeError),
    Response(InvoiceLineNode),
}

pub fn get_insert_inbound_shipment_line_response(
    connection_manager: &StorageConnectionManager,
    input: InsertInboundShipmentLineInput,
) -> InsertInboundShipmentLineResponse {
    use InsertInboundShipmentLineResponse::*;
    let connection = match connection_manager.connection() {
        Ok(con) => con,
        Err(err) => {
            return InsertInboundShipmentLineResponse::Error(InsertError {
                error: InsertErrorInterface::DatabaseError(DatabaseError(err)),
            })
        }
    };
    match insert_inbound_shipment_line(&connection, input.into()) {
        Ok(id) => match get_invoice_line_response(connection_manager, id) {
            InvoiceLineResponse::Response(node) => Response(node),
            InvoiceLineResponse::Error(err) => NodeError(err),
        },
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(name = "InsertInboundShipmentLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordAlreadyExist(RecordAlreadyExist),
    RangeError(RangeError),
    CannotEditInvoice(CannotEditInvoice),
    NotAnInboundShipment(NotAnInboundShipment),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
}

impl From<InsertInboundShipmentLineInput> for InsertInboundShipmentLine {
    fn from(
        InsertInboundShipmentLineInput {
            id,
            invoice_id,
            item_id,
            location_id,
            pack_size,
            batch,
            expiry_date,
            sell_price_per_pack,
            cost_price_per_pack,
            number_of_packs,
            total_before_tax,
            total_after_tax,
            tax,
        }: InsertInboundShipmentLineInput,
    ) -> Self {
        InsertInboundShipmentLine {
            id,
            invoice_id,
            item_id,
            location_id,
            pack_size,
            batch,
            expiry_date,
            sell_price_per_pack,
            cost_price_per_pack,
            number_of_packs,
            total_before_tax,
            total_after_tax,
            tax,
        }
    }
}

impl From<InsertInboundShipmentLineError> for InsertInboundShipmentLineResponse {
    fn from(error: InsertInboundShipmentLineError) -> Self {
        use InsertErrorInterface as OutError;
        let error = match error {
            InsertInboundShipmentLineError::LineAlreadyExists => {
                OutError::RecordAlreadyExist(RecordAlreadyExist {})
            }
            InsertInboundShipmentLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            InsertInboundShipmentLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            InsertInboundShipmentLineError::NotAnInboundShipment => {
                OutError::NotAnInboundShipment(NotAnInboundShipment {})
            }
            InsertInboundShipmentLineError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            InsertInboundShipmentLineError::CannotEditFinalised => {
                OutError::CannotEditInvoice(CannotEditInvoice {})
            }
            InsertInboundShipmentLineError::ItemNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::ItemId))
            }
            InsertInboundShipmentLineError::NumberOfPacksBelowOne => {
                OutError::RangeError(RangeError {
                    field: RangeField::NumberOfPacks,
                    range: Range::Min(1),
                })
            }
            InsertInboundShipmentLineError::PackSizeBelowOne => OutError::RangeError(RangeError {
                field: RangeField::PackSize,
                range: Range::Min(1),
            }),
            InsertInboundShipmentLineError::LocationDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::LocationId))
            }
        };

        InsertInboundShipmentLineResponse::Error(InsertError { error })
    }
}
