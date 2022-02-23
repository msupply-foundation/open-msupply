use async_graphql::*;

use domain::outbound_shipment::InsertOutboundShipmentLine;
use graphql_core::simple_generic_errors::{
    CannotEditInvoice, DatabaseError, ForeignKey, ForeignKeyError,
    InvoiceDoesNotBelongToCurrentStore, InvoiceLineBelongsToAnotherInvoice, NodeError,
    NotAnInboundShipment, NotAnOutboundShipment, Range, RangeError, RangeField, RecordNotFound, RecordAlreadyExist,
};
use graphql_types::types::{
    get_invoice_line_response, GenericDeleteResponse, InvoiceLineNode, InvoiceLineResponse,
};
use repository::StorageConnectionManager;
use service::invoice_line::{insert_outbound_shipment_line, InsertOutboundShipmentLineError};

use super::{
    ItemDoesNotMatchStockLine, LocationNotFound, StockLineAlreadyExistsInInvoice,
    StockLineDoesNotBelongToCurrentStore, NotEnoughStockForReduction, LocationIsOnHold, StockLineIsOnHold,
};

#[derive(InputObject)]
pub struct InsertOutboundShipmentLineInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub stock_line_id: String,
    pub number_of_packs: u32,
    pub total_before_tax: f64,
    pub total_after_tax: f64,
    pub tax: Option<f64>,
}

#[derive(SimpleObject)]
#[graphql(name = "InsertOutboundShipmentLineError")]
pub struct InsertError {
    pub error: InsertErrorInterface,
}

#[derive(Union)]
pub enum InsertOutboundShipmentLineResponse {
    Error(InsertError),
    NodeError(NodeError),
    Response(InvoiceLineNode),
}

pub fn get_insert_outbound_shipment_line_response(
    connection_manager: &StorageConnectionManager,
    input: InsertOutboundShipmentLineInput,
) -> InsertOutboundShipmentLineResponse {
    use InsertOutboundShipmentLineResponse::*;
    let connection = match connection_manager.connection() {
        Ok(con) => con,
        Err(err) => {
            return InsertOutboundShipmentLineResponse::Error(InsertError {
                error: InsertErrorInterface::DatabaseError(DatabaseError(err)),
            })
        }
    };
    match insert_outbound_shipment_line(&connection, input.into()) {
        Ok(id) => match get_invoice_line_response(connection_manager, id) {
            InvoiceLineResponse::Response(node) => Response(node),
            InvoiceLineResponse::Error(err) => NodeError(err),
        },
        Err(error) => error.into(),
    }
}

#[derive(Interface)]
#[graphql(name = "InsertOutboundShipmentLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordAlreadyExist(RecordAlreadyExist),
    RangeError(RangeError),
    CannotEditInvoice(CannotEditInvoice),
    NotAnOutboundShipment(NotAnOutboundShipment),
    StockLineDoesNotBelongToCurrentStore(StockLineDoesNotBelongToCurrentStore),
    ItemDoesNotMatchStockLine(ItemDoesNotMatchStockLine),
    StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    NotEnoughStockForReduction(NotEnoughStockForReduction),
    LocationIsOnHold(LocationIsOnHold),
    LocationNotFound(LocationNotFound),
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
            total_before_tax,
            total_after_tax,
            tax,
        }: InsertOutboundShipmentLineInput,
    ) -> Self {
        InsertOutboundShipmentLine {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
            total_before_tax,
            total_after_tax,
            tax,
        }
    }
}

impl From<InsertOutboundShipmentLineError> for InsertOutboundShipmentLineResponse {
    fn from(error: InsertOutboundShipmentLineError) -> Self {
        use InsertErrorInterface as OutError;
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
                OutError::CannotEditInvoice(CannotEditInvoice {})
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
            InsertOutboundShipmentLineError::LocationNotFound => {
                OutError::LocationNotFound(LocationNotFound {})
            }
        };
        InsertOutboundShipmentLineResponse::Error(InsertError { error })
    }
}
