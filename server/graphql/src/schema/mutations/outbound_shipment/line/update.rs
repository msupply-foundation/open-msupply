use async_graphql::*;

use crate::schema::{
    mutations::{
        CannotEditInvoice, ForeignKey, ForeignKeyError, InvoiceDoesNotBelongToCurrentStore,
        InvoiceLineBelongsToAnotherInvoice, NotAnOutboundShipment,
    },
    types::{
        get_invoice_line_response, DatabaseError, ErrorWrapper, InvoiceLineNode,
        InvoiceLineResponse, NodeError, Range, RangeError, RangeField, RecordNotFound,
    },
};
use domain::outbound_shipment::UpdateOutboundShipmentLine;
use repository::StorageConnectionManager;
use service::invoice_line::{update_outbound_shipment_line, UpdateOutboundShipmentLineError};

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

#[derive(Union)]
pub enum UpdateOutboundShipmentLineResponse {
    Error(ErrorWrapper<UpdateOutboundShipmentLineErrorInterface>),
    NodeError(NodeError),
    Response(InvoiceLineNode),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateOutboundShipmentLineErrorInterface {
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
        }: UpdateOutboundShipmentLineInput,
    ) -> Self {
        UpdateOutboundShipmentLine {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
        }
    }
}

impl From<UpdateOutboundShipmentLineError> for UpdateOutboundShipmentLineResponse {
    fn from(error: UpdateOutboundShipmentLineError) -> Self {
        use UpdateOutboundShipmentLineErrorInterface as OutError;
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
            UpdateOutboundShipmentLineError::NotThisInvoiceLine(invoice_id) => {
                OutError::InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice(
                    invoice_id,
                ))
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

        UpdateOutboundShipmentLineResponse::Error(ErrorWrapper { error })
    }
}
