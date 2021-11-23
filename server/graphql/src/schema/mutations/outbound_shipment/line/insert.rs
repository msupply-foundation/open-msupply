use async_graphql::*;

use crate::schema::{
    mutations::{
        outbound_shipment::{LocationIsOnHold, NotEnoughStockForReduction, StockLineIsOnHold},
        CannotEditFinalisedInvoice, ForeignKey, ForeignKeyError,
        InvoiceDoesNotBelongToCurrentStore, NotAnOutboundShipment, RecordAlreadyExist,
    },
    types::{
        get_invoice_line_response, DatabaseError, ErrorWrapper, InvoiceLineNode,
        InvoiceLineResponse, NodeError, Range, RangeError, RangeField,
    },
};
use domain::outbound_shipment::InsertOutboundShipmentLine;
use repository::StorageConnectionManager;
use service::invoice_line::{insert_outbound_shipment_line, InsertOutboundShipmentLineError};

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
    NodeError(NodeError),
    Response(InvoiceLineNode),
}

pub fn get_insert_outbound_shipment_line_response(
    connection_manager: &StorageConnectionManager,
    input: InsertOutboundShipmentLineInput,
) -> InsertOutboundShipmentLineResponse {
    use InsertOutboundShipmentLineResponse::*;
    match insert_outbound_shipment_line(connection_manager, input.into()) {
        Ok(id) => match get_invoice_line_response(connection_manager, id) {
            InvoiceLineResponse::Response(node) => Response(node),
            InvoiceLineResponse::Error(err) => NodeError(err),
        },
        Err(error) => error.into(),
    }
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
    LocationIsOnHold(LocationIsOnHold),
    StockLineIsOnHold(StockLineIsOnHold),
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
            InsertOutboundShipmentLineError::BatchIsOnHold => {
                OutError::StockLineIsOnHold(StockLineIsOnHold {})
            }
            InsertOutboundShipmentLineError::LocationIsOnHold => {
                OutError::LocationIsOnHold(LocationIsOnHold {})
            }
        };
        InsertOutboundShipmentLineResponse::Error(ErrorWrapper { error })
    }
}
