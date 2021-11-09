use async_graphql::*;
use chrono::NaiveDate;

use crate::{
    server::service::graphql::schema::{
        mutations::{
            CannotEditFinalisedInvoice, ForeignKey, ForeignKeyError,
            InvoiceDoesNotBelongToCurrentStore, NotAnInboundShipment, RecordAlreadyExist,
        },
        types::{
            get_invoice_line_response, DatabaseError, ErrorWrapper, InvoiceLineResponse, Range,
            RangeError, RangeField,
        },
    },
    service::invoice_line::{insert_inbound_shipment_line, InsertInboundShipmentLineError},
};
use domain::inbound_shipment::InsertInboundShipmentLine;
use repository::repository::StorageConnectionManager;

#[derive(InputObject)]
pub struct InsertInboundShipmentLineInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub pack_size: u32,
    pub batch: Option<String>,
    pub cost_price_per_pack: f64,
    pub sell_price_per_pack: f64,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: u32,
}

#[derive(Union)]
pub enum InsertInboundShipmentLineResponse {
    Error(ErrorWrapper<InsertInboundShipmentLineErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceLineResponse),
}

pub fn get_insert_inbound_shipment_line_response(
    connection_manager: &StorageConnectionManager,
    input: InsertInboundShipmentLineInput,
) -> InsertInboundShipmentLineResponse {
    use InsertInboundShipmentLineResponse::*;
    match insert_inbound_shipment_line(connection_manager, input.into()) {
        Ok(id) => Response(get_invoice_line_response(connection_manager, id)),
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertInboundShipmentLineErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordAlreadyExist(RecordAlreadyExist),
    RangeError(RangeError),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotAnInboundShipment(NotAnInboundShipment),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
}

impl From<InsertInboundShipmentLineInput> for InsertInboundShipmentLine {
    fn from(
        InsertInboundShipmentLineInput {
            id,
            invoice_id,
            item_id,
            pack_size,
            batch,
            expiry_date,
            sell_price_per_pack,
            cost_price_per_pack,
            number_of_packs,
        }: InsertInboundShipmentLineInput,
    ) -> Self {
        InsertInboundShipmentLine {
            id,
            invoice_id,
            item_id,
            pack_size,
            batch,
            expiry_date,
            sell_price_per_pack,
            cost_price_per_pack,
            number_of_packs,
        }
    }
}

impl From<InsertInboundShipmentLineError> for InsertInboundShipmentLineResponse {
    fn from(error: InsertInboundShipmentLineError) -> Self {
        use InsertInboundShipmentLineErrorInterface as OutError;
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
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
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
        };

        InsertInboundShipmentLineResponse::Error(ErrorWrapper { error })
    }
}
