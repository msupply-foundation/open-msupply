use async_graphql::*;

use graphql_core::simple_generic_errors::{
    CannotEditInvoice, DatabaseError, ForeignKey, ForeignKeyError,
    InvoiceDoesNotBelongToCurrentStore, InvoiceLineBelongsToAnotherInvoice, NodeError,
    NotAnOutboundShipment, Range, RangeError, RangeField, RecordNotFound,
};
use graphql_types::types::{get_invoice_line_response, InvoiceLineNode, InvoiceLineResponse};
use repository::StorageConnectionManager;
use service::invoice_line::{
    update_outbound_shipment_line, ShipmentTaxUpdate, UpdateOutboundShipmentLine,
    UpdateOutboundShipmentLineError,
};

use crate::mutations::outbound_shipment_line::TaxUpdate;

use super::{
    ItemDoesNotMatchStockLine, LineDoesNotReferenceStockLine, LocationIsOnHold, LocationNotFound,
    NotEnoughStockForReduction, StockLineAlreadyExistsInInvoice,
    StockLineDoesNotBelongToCurrentStore, StockLineIsOnHold,
};

#[derive(InputObject)]
pub struct UpdateOutboundShipmentLineInput {
    pub id: String,
    invoice_id: String,
    item_id: Option<String>,
    stock_line_id: Option<String>,
    number_of_packs: Option<u32>,
    total_before_tax: Option<f64>,
    total_after_tax: Option<f64>,
    tax: Option<TaxUpdate>,
}

pub fn get_update_outbound_shipment_line_response(
    connection_manager: &StorageConnectionManager,
    input: UpdateOutboundShipmentLineInput,
) -> UpdateOutboundShipmentLineResponse {
    use UpdateOutboundShipmentLineResponse::*;
    match update_outbound_shipment_line(connection_manager, input.into()) {
        Ok(id) => match get_invoice_line_response(connection_manager, id) {
            InvoiceLineResponse::Response(node) => Response(node),
            InvoiceLineResponse::Error(err) => NodeError(err),
        },
        Err(error) => error.into(),
    }
}

#[derive(SimpleObject)]
#[graphql(name = "UpdateOutboundShipmentLineError")]
pub struct UpdateError {
    pub error: UpdateErrorInterface,
}

#[derive(Union)]
pub enum UpdateOutboundShipmentLineResponse {
    Error(UpdateError),
    NodeError(NodeError),
    Response(InvoiceLineNode),
}

#[derive(Interface)]
#[graphql(name = "UpdateOutboundShipmentLineErrorInterface")]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordNotFound(RecordNotFound),
    CannotEditInvoice(CannotEditInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    StockLineDoesNotBelongToCurrentStore(StockLineDoesNotBelongToCurrentStore),
    LineDoesNotReferenceStockLine(LineDoesNotReferenceStockLine),
    ItemDoesNotMatchStockLine(ItemDoesNotMatchStockLine),
    StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    NotAnOutboundShipment(NotAnOutboundShipment),
    LocationIsOnHold(LocationIsOnHold),
    LocationNotFound(LocationNotFound),
    RangeError(RangeError),
    StockLineIsOnHold(StockLineIsOnHold),
    NotEnoughStockForReduction(NotEnoughStockForReduction),
}

impl From<UpdateOutboundShipmentLineInput> for UpdateOutboundShipmentLine {
    fn from(
        UpdateOutboundShipmentLineInput {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
            total_before_tax,
            total_after_tax,
            tax,
        }: UpdateOutboundShipmentLineInput,
    ) -> Self {
        UpdateOutboundShipmentLine {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
            total_before_tax,
            total_after_tax,
            tax: tax.map(|tax| ShipmentTaxUpdate {
                percentage: tax.percentage,
            }),
        }
    }
}

impl From<UpdateOutboundShipmentLineError> for UpdateOutboundShipmentLineResponse {
    fn from(error: UpdateOutboundShipmentLineError) -> Self {
        use UpdateErrorInterface as OutError;
        let error = match error {
            UpdateOutboundShipmentLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            UpdateOutboundShipmentLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            UpdateOutboundShipmentLineError::NotAnOutboundShipment => {
                OutError::NotAnOutboundShipment(NotAnOutboundShipment {})
            }
            UpdateOutboundShipmentLineError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            UpdateOutboundShipmentLineError::CannotEditFinalised => {
                OutError::CannotEditInvoice(CannotEditInvoice {})
            }
            UpdateOutboundShipmentLineError::ItemNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::ItemId))
            }
            UpdateOutboundShipmentLineError::NumberOfPacksBelowOne => {
                OutError::RangeError(RangeError {
                    field: RangeField::NumberOfPacks,
                    range: Range::Min(1),
                })
            }
            UpdateOutboundShipmentLineError::StockLineNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::StockLineId))
            }
            UpdateOutboundShipmentLineError::StockLineAlreadyExistsInInvoice(line_id) => {
                OutError::StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice(line_id))
            }
            UpdateOutboundShipmentLineError::ItemDoesNotMatchStockLine => {
                OutError::ItemDoesNotMatchStockLine(ItemDoesNotMatchStockLine {})
            }
            UpdateOutboundShipmentLineError::LineDoesNotExist => {
                OutError::RecordNotFound(RecordNotFound {})
            }
            UpdateOutboundShipmentLineError::LineDoesNotReferenceStockLine => {
                OutError::LineDoesNotReferenceStockLine(LineDoesNotReferenceStockLine {})
            }
            UpdateOutboundShipmentLineError::ReductionBelowZero {
                stock_line_id,
                line_id,
            } => OutError::NotEnoughStockForReduction(NotEnoughStockForReduction {
                stock_line_id,
                line_id: Some(line_id),
            }),
            UpdateOutboundShipmentLineError::NotThisInvoiceLine(_invoice_id) => {
                OutError::InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice {})
            }
            UpdateOutboundShipmentLineError::BatchIsOnHold => {
                OutError::StockLineIsOnHold(StockLineIsOnHold {})
            }
            UpdateOutboundShipmentLineError::LocationIsOnHold => {
                OutError::LocationIsOnHold(LocationIsOnHold {})
            }
            UpdateOutboundShipmentLineError::LocationNotFound => {
                OutError::LocationNotFound(LocationNotFound {})
            }
        };

        UpdateOutboundShipmentLineResponse::Error(UpdateError { error })
    }
}
