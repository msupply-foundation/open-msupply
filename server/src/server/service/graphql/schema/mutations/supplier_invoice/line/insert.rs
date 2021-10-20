use async_graphql::*;
use chrono::NaiveDate;

use crate::{
    domain::{invoice_line::InvoiceLine, supplier_invoice::InsertSupplierInvoiceLine},
    server::service::graphql::schema::{
        mutations::{
            CannotEditFinalisedInvoice, ForeignKey, ForeignKeyError,
            InvoiceDoesNotBelongToCurrentStore, NotASupplierInvoice, RecordAlreadyExist,
        },
        types::{DatabaseError, ErrorWrapper, InvoiceLineResponse, Range, RangeError, RangeField},
    },
    service::{invoice_line::InsertSupplierInvoiceLineError, SingleRecordError},
};

#[derive(InputObject)]
pub struct InsertSupplierInvoiceLineInput {
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
pub enum InsertSupplierInvoiceLineResponse {
    Error(ErrorWrapper<InsertSupplierInvoiceLineErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceLineResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum InsertSupplierInvoiceLineErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordAlreadyExist(RecordAlreadyExist),
    RangeError(RangeError),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotASupplierInvoice(NotASupplierInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
}

impl From<InsertSupplierInvoiceLineInput> for InsertSupplierInvoiceLine {
    fn from(
        InsertSupplierInvoiceLineInput {
            id,
            invoice_id,
            item_id,
            pack_size,
            batch,
            expiry_date,
            sell_price_per_pack,
            cost_price_per_pack,
            number_of_packs,
        }: InsertSupplierInvoiceLineInput,
    ) -> Self {
        InsertSupplierInvoiceLine {
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

impl From<Result<InvoiceLine, SingleRecordError>> for InsertSupplierInvoiceLineResponse {
    fn from(result: Result<InvoiceLine, SingleRecordError>) -> Self {
        let invoice_line_response: InvoiceLineResponse = result.into();
        // Implemented by flatten union
        invoice_line_response.into()
    }
}

impl From<InsertSupplierInvoiceLineError> for InsertSupplierInvoiceLineResponse {
    fn from(error: InsertSupplierInvoiceLineError) -> Self {
        use InsertSupplierInvoiceLineErrorInterface as OutError;
        let error = match error {
            InsertSupplierInvoiceLineError::LineAlreadyExists => {
                OutError::RecordAlreadyExist(RecordAlreadyExist {})
            }
            InsertSupplierInvoiceLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            InsertSupplierInvoiceLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            InsertSupplierInvoiceLineError::NotASupplierInvoice => {
                OutError::NotASupplierInvoice(NotASupplierInvoice {})
            }
            InsertSupplierInvoiceLineError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            InsertSupplierInvoiceLineError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
            InsertSupplierInvoiceLineError::ItemNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::ItemId))
            }
            InsertSupplierInvoiceLineError::NumberOfPacksBelowOne => {
                OutError::RangeError(RangeError {
                    field: RangeField::NumberOfPacks,
                    range: Range::Min(1),
                })
            }
            InsertSupplierInvoiceLineError::PackSizeBelowOne => OutError::RangeError(RangeError {
                field: RangeField::PackSize,
                range: Range::Min(1),
            }),
        };

        InsertSupplierInvoiceLineResponse::Error(ErrorWrapper { error })
    }
}
