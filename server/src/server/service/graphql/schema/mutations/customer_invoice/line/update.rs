use async_graphql::*;

use crate::{
    domain::{customer_invoice::UpdateCustomerInvoiceLine, invoice_line::InvoiceLine},
    server::service::graphql::schema::{
        mutations::{
            CannotEditFinalisedInvoice, ForeignKey, ForeignKeyError,
            InvoiceDoesNotBelongToCurrentStore, InvoiceLineBelongsToAnotherInvoice,
            NotACustomerInvoice, NumberOfPacksAboveZero, RecordDoesNotExist,
        },
        types::{DatabaseError, ErrorWrapper, InvoiceLineResponse, Range, RangeError, RangeField},
    },
    service::{invoice_line::UpdateCustomerInvoiceLineError, SingleRecordError},
};

use super::{
    ItemDoesNotMatchStockLine, LineDoesntReferenceStockLine, StockLineAlreadyExistsInInvoice,
    StockLineDoesNotBelongToCurrentStore,
};

#[derive(InputObject)]
pub struct UpdateCustomerInvoiceLineInput {
    id: String,
    invoice_id: String,
    item_id: Option<String>,
    stock_line_id: Option<String>,
    number_of_packs: Option<u32>,
}

#[derive(Union)]
pub enum UpdateCustomerInvoiceLineResponse {
    Error(ErrorWrapper<UpdateCustomerInvoiceLineErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceLineResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateCustomerInvoiceLineErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordDoesNotExist(RecordDoesNotExist),
    NumberOfPacksAboveZero(NumberOfPacksAboveZero),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    StockLineDoesNotBelongToCurrentStore(StockLineDoesNotBelongToCurrentStore),
    LineDoesntReferenceStockLine(LineDoesntReferenceStockLine),
    ItemDoesNotMatchStockLine(ItemDoesNotMatchStockLine),
    StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    NotACustomerInvoice(NotACustomerInvoice),
    RangeError(RangeError),
}

impl From<UpdateCustomerInvoiceLineInput> for UpdateCustomerInvoiceLine {
    fn from(
        UpdateCustomerInvoiceLineInput {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
        }: UpdateCustomerInvoiceLineInput,
    ) -> Self {
        UpdateCustomerInvoiceLine {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
        }
    }
}

impl From<Result<InvoiceLine, SingleRecordError>> for UpdateCustomerInvoiceLineResponse {
    fn from(result: Result<InvoiceLine, SingleRecordError>) -> Self {
        let invoice_line_response: InvoiceLineResponse = result.into();
        // Implemented by flatten union
        invoice_line_response.into()
    }
}

impl From<UpdateCustomerInvoiceLineError> for UpdateCustomerInvoiceLineResponse {
    fn from(error: UpdateCustomerInvoiceLineError) -> Self {
        use UpdateCustomerInvoiceLineErrorInterface as OutError;
        let error = match error {
            UpdateCustomerInvoiceLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            UpdateCustomerInvoiceLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            UpdateCustomerInvoiceLineError::NotACustomerInvoice => {
                OutError::NotACustomerInvoice(NotACustomerInvoice {})
            }
            UpdateCustomerInvoiceLineError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            UpdateCustomerInvoiceLineError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
            UpdateCustomerInvoiceLineError::ItemNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::ItemId))
            }
            UpdateCustomerInvoiceLineError::NumberOfPacksBelowOne => {
                OutError::RangeError(RangeError {
                    field: RangeField::NumberOfPacks,
                    range: Range::Min(1),
                })
            }
            UpdateCustomerInvoiceLineError::StockLineNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::StockLineId))
            }
            UpdateCustomerInvoiceLineError::StockLineAlreadyExistsInInvoice(line_id) => {
                OutError::StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice(line_id))
            }
            UpdateCustomerInvoiceLineError::ItemDoesNotMatchStockLine => {
                OutError::ItemDoesNotMatchStockLine(ItemDoesNotMatchStockLine {})
            }
            UpdateCustomerInvoiceLineError::LineDoesNotExist => {
                OutError::RecordDoesNotExist(RecordDoesNotExist {})
            }
            UpdateCustomerInvoiceLineError::LineDoesntReferenceStockLine => {
                OutError::LineDoesntReferenceStockLine(LineDoesntReferenceStockLine {})
            }
        };

        UpdateCustomerInvoiceLineResponse::Error(ErrorWrapper { error })
    }
}
