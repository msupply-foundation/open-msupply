use async_graphql::*;

use crate::{
    domain::{invoice_line::InvoiceLine, outbound_shipment::InsertOutboundShipmentLine},
    server::service::graphql::schema::{
        mutations::{
            outbound_shipment::NotEnoughStockForReduction, CannotEditFinalisedInvoice, ForeignKey,
            ForeignKeyError, InvoiceDoesNotBelongToCurrentStore, NotAnOutboundShipment,
            RecordAlreadyExist,
        },
        types::{DatabaseError, ErrorWrapper, InvoiceLineResponse, Range, RangeError, RangeField},
    },
    service::{invoice_line::InsertOutboundShipmentLineError, SingleRecordError},
};

use super::{
    ItemDoesNotMatchStockLine, StockLineAlreadyExistsInInvoice,
    StockLineDoesNotBelongToCurrentStore,
};

#[derive(InputObject)]
pub struct InsertOutboundShipmentLineInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub stock_line_id: String,
    pub number_of_packs: u32,
}

#[derive(Union)]
pub enum InsertOutboundShipmentLineResponse {
    Error(ErrorWrapper<InsertOutboundShipmentLineErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceLineResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertOutboundShipmentLineErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordAlreadyExist(RecordAlreadyExist),
    RangeError(RangeError),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotAnOutboundShipment(NotAnOutboundShipment),
    StockLineDoesNotBelongToCurrentStore(StockLineDoesNotBelongToCurrentStore),
    ItemDoesNotMatchStockLine(ItemDoesNotMatchStockLine),
    StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    NotEnoughStockForReduction(NotEnoughStockForReduction),
}

impl From<InsertOutboundShipmentLineInput> for InsertOutboundShipmentLine {
    fn from(
        InsertOutboundShipmentLineInput {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
        }: InsertOutboundShipmentLineInput,
    ) -> Self {
        InsertOutboundShipmentLine {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
        }
    }
}

impl From<Result<InvoiceLine, SingleRecordError>> for InsertOutboundShipmentLineResponse {
    fn from(result: Result<InvoiceLine, SingleRecordError>) -> Self {
        let invoice_line_response: InvoiceLineResponse = result.into();
        // Implemented by flatten union
        invoice_line_response.into()
    }
}

impl From<InsertOutboundShipmentLineError> for InsertOutboundShipmentLineResponse {
    fn from(error: InsertOutboundShipmentLineError) -> Self {
        use InsertOutboundShipmentLineErrorInterface as OutError;
        let error = match error {
            InsertOutboundShipmentLineError::LineAlreadyExists => {
                OutError::RecordAlreadyExist(RecordAlreadyExist {})
            }
            InsertOutboundShipmentLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            InsertOutboundShipmentLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            InsertOutboundShipmentLineError::NotAnOutboundShipment => {
                OutError::NotAnOutboundShipment(NotAnOutboundShipment {})
            }
            InsertOutboundShipmentLineError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            InsertOutboundShipmentLineError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
            InsertOutboundShipmentLineError::ItemNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::ItemId))
            }
            InsertOutboundShipmentLineError::NumberOfPacksBelowOne => {
                OutError::RangeError(RangeError {
                    field: RangeField::NumberOfPacks,
                    range: Range::Min(1),
                })
            }
            InsertOutboundShipmentLineError::StockLineNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::StockLineId))
            }
            InsertOutboundShipmentLineError::StockLineAlreadyExistsInInvoice(line_id) => {
                OutError::StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice(line_id))
            }
            InsertOutboundShipmentLineError::ItemDoesNotMatchStockLine => {
                OutError::ItemDoesNotMatchStockLine(ItemDoesNotMatchStockLine {})
            }
            InsertOutboundShipmentLineError::ReductionBelowZero { stock_line_id } => {
                OutError::NotEnoughStockForReduction(NotEnoughStockForReduction {
                    stock_line_id,
                    line_id: None,
                })
            }
        };

        InsertOutboundShipmentLineResponse::Error(ErrorWrapper { error })
    }
}
