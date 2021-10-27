use async_graphql::*;

use crate::{
    domain::{invoice_line::InvoiceLine, outbound_shipment::UpdateOutboundShipmentLine},
    server::service::graphql::schema::{
        mutations::{
            CannotEditFinalisedInvoice, ForeignKey, ForeignKeyError,
            InvoiceDoesNotBelongToCurrentStore, InvoiceLineBelongsToAnotherInvoice,
            NotAnOutboundShipment,
        },
        types::{
            DatabaseError, ErrorWrapper, InvoiceLineResponse, Range, RangeError, RangeField,
            RecordNotFound,
        },
    },
    service::{invoice_line::UpdateOutboundShipmentLineError, SingleRecordError},
};

use super::{
    ItemDoesNotMatchStockLine, LineDoesNotReferenceStockLine, NotEnoughStockForReduction,
    StockLineAlreadyExistsInInvoice, StockLineDoesNotBelongToCurrentStore,
};

#[derive(InputObject)]
pub struct UpdateOutboundShipmentLineInput {
    id: String,
    invoice_id: String,
    item_id: Option<String>,
    stock_line_id: Option<String>,
    number_of_packs: Option<u32>,
}

#[derive(Union)]
pub enum UpdateOutboundShipmentLineResponse {
    Error(ErrorWrapper<UpdateOutboundShipmentLineErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceLineResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateOutboundShipmentLineErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordNotFound(RecordNotFound),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    StockLineDoesNotBelongToCurrentStore(StockLineDoesNotBelongToCurrentStore),
    LineDoesNotReferenceStockLine(LineDoesNotReferenceStockLine),
    ItemDoesNotMatchStockLine(ItemDoesNotMatchStockLine),
    StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    NotAnOutboundShipment(NotAnOutboundShipment),
    RangeError(RangeError),
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

impl From<Result<InvoiceLine, SingleRecordError>> for UpdateOutboundShipmentLineResponse {
    fn from(result: Result<InvoiceLine, SingleRecordError>) -> Self {
        let invoice_line_response: InvoiceLineResponse = result.into();
        // Implemented by flatten union
        invoice_line_response.into()
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
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
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
        };

        UpdateOutboundShipmentLineResponse::Error(ErrorWrapper { error })
    }
}
