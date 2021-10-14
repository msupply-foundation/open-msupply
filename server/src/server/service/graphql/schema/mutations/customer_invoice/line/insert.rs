use async_graphql::*;

use crate::{
    domain::{customer_invoice::InsertCustomerInvoiceLine, invoice_line::InvoiceLine},
    server::service::graphql::schema::{
        mutations::{
            CannotEditFinalisedInvoice, ForeignKey, ForeignKeyError,
            InvoiceDoesNotBelongToCurrentStore, NotACustomerInvoice, RecordAlreadyExist,
        },
        types::{DatabaseError, ErrorWrapper, InvoiceLineResponse, Range, RangeError, RangeField},
    },
    service::{invoice_line::InsertCustomerInvoiceLineError, SingleRecordError},
};

use super::{
    ItemDoesNotMatchStockLine, StockLineAlreadyExistsInInvoice,
    StockLineDoesNotBelongToCurrentStore,
};

#[derive(InputObject)]
pub struct InsertCustomerInvoiceLineInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: String,
    pub stock_line_id: String,
    pub number_of_packs: u32,
}

#[derive(Union)]
pub enum InsertCustomerInvoiceLineResponse {
    Error(ErrorWrapper<InsertCustomerInvoiceLineErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceLineResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertCustomerInvoiceLineErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordAlreadyExist(RecordAlreadyExist),
    RangeError(RangeError),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotACustomerInvoice(NotACustomerInvoice),
    StockLineDoesNotBelongToCurrentStore(StockLineDoesNotBelongToCurrentStore),
    ItemDoesNotMatchStockLine(ItemDoesNotMatchStockLine),
    StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
}

impl From<InsertCustomerInvoiceLineInput> for InsertCustomerInvoiceLine {
    fn from(
        InsertCustomerInvoiceLineInput {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
        }: InsertCustomerInvoiceLineInput,
    ) -> Self {
        InsertCustomerInvoiceLine {
            id,
            invoice_id,
            item_id,
            stock_line_id,
            number_of_packs,
        }
    }
}

impl From<Result<InvoiceLine, SingleRecordError>> for InsertCustomerInvoiceLineResponse {
    fn from(result: Result<InvoiceLine, SingleRecordError>) -> Self {
        let invoice_line_response: InvoiceLineResponse = result.into();
        // Implemented by flatten union
        invoice_line_response.into()
    }
}

impl From<InsertCustomerInvoiceLineError> for InsertCustomerInvoiceLineResponse {
    fn from(error: InsertCustomerInvoiceLineError) -> Self {
        use InsertCustomerInvoiceLineErrorInterface as OutError;
        let error = match error {
            InsertCustomerInvoiceLineError::LineAlreadyExists => {
                OutError::RecordAlreadyExist(RecordAlreadyExist {})
            }
            InsertCustomerInvoiceLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            InsertCustomerInvoiceLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            InsertCustomerInvoiceLineError::NotACustomerInvoice => {
                OutError::NotACustomerInvoice(NotACustomerInvoice {})
            }
            InsertCustomerInvoiceLineError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            InsertCustomerInvoiceLineError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
            InsertCustomerInvoiceLineError::ItemNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::ItemId))
            }
            InsertCustomerInvoiceLineError::NumberOfPacksBelowOne => {
                OutError::RangeError(RangeError {
                    field: RangeField::NumberOfPacks,
                    range: Range::Min(1),
                })
            }
            InsertCustomerInvoiceLineError::StockLineNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::StockLineId))
            }
            InsertCustomerInvoiceLineError::StockLineAlreadyExistsInInvoice(line_id) => {
                OutError::StockLineAlreadyExistsInInvoice(StockLineAlreadyExistsInInvoice(line_id))
            }
            InsertCustomerInvoiceLineError::ItemDoesNotMatchStockLine => {
                OutError::ItemDoesNotMatchStockLine(ItemDoesNotMatchStockLine {})
            }
        };

        InsertCustomerInvoiceLineResponse::Error(ErrorWrapper { error })
    }
}
