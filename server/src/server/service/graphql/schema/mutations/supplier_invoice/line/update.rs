use async_graphql::*;
use chrono::NaiveDate;

use crate::{
    domain::{invoice_line::InvoiceLine, supplier_invoice::UpdateSupplierInvoiceLine},
    server::service::graphql::schema::{
        mutations::{
            CannotEditFinalisedInvoice, ForeignKey, ForeignKeyError,
            InvoiceDoesNotBelongToCurrentStore, NotASupplierInvoice,
        },
        types::{
            DatabaseError, ErrorWrapper, InvoiceLineResponse, Range, RangeError, RangeField,
            RecordNotFound,
        },
    },
    service::{invoice_line::UpdateSupplierInvoiceLineError, SingleRecordError},
};

use super::{BatchIsReserved, InvoiceLineBelongsToAnotherInvoice};

#[derive(InputObject)]
pub struct UpdateSupplierInvoiceLineInput {
    pub id: String,
    pub invoice_id: String,
    pub item_id: Option<String>,
    pub pack_size: Option<u32>,
    pub batch: Option<String>,
    pub cost_price_per_pack: Option<f64>,
    pub sell_price_per_pack: Option<f64>,
    pub expiry_date: Option<NaiveDate>,
    pub number_of_packs: Option<u32>,
}

#[derive(Union)]
pub enum UpdateSupplierInvoiceLineResponse {
    Error(ErrorWrapper<UpdateSupplierInvoiceLineErrorInterface>),
    #[graphql(flatten)]
    Response(InvoiceLineResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum UpdateSupplierInvoiceLineErrorInterface {
    DatabaseError(DatabaseError),
    ForeignKeyError(ForeignKeyError),
    RecordNotFound(RecordNotFound),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    NotASupplierInvoice(NotASupplierInvoice),
    BatchIsReserved(BatchIsReserved),
    RangeError(RangeError),
}

impl From<UpdateSupplierInvoiceLineInput> for UpdateSupplierInvoiceLine {
    fn from(
        UpdateSupplierInvoiceLineInput {
            id,
            invoice_id,
            item_id,
            pack_size,
            batch,
            expiry_date,
            sell_price_per_pack,
            cost_price_per_pack,
            number_of_packs,
        }: UpdateSupplierInvoiceLineInput,
    ) -> Self {
        UpdateSupplierInvoiceLine {
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

impl From<Result<InvoiceLine, SingleRecordError>> for UpdateSupplierInvoiceLineResponse {
    fn from(result: Result<InvoiceLine, SingleRecordError>) -> Self {
        let invoice_line_response: InvoiceLineResponse = result.into();
        // Implemented by flatten union
        invoice_line_response.into()
    }
}

impl From<UpdateSupplierInvoiceLineError> for UpdateSupplierInvoiceLineResponse {
    fn from(error: UpdateSupplierInvoiceLineError) -> Self {
        use UpdateSupplierInvoiceLineErrorInterface as OutError;
        let error = match error {
            UpdateSupplierInvoiceLineError::LineDoesNotExist => {
                OutError::RecordNotFound(RecordNotFound {})
            }
            UpdateSupplierInvoiceLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            UpdateSupplierInvoiceLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            UpdateSupplierInvoiceLineError::NotASupplierInvoice => {
                OutError::NotASupplierInvoice(NotASupplierInvoice {})
            }
            UpdateSupplierInvoiceLineError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            UpdateSupplierInvoiceLineError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
            UpdateSupplierInvoiceLineError::ItemNotFound => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::ItemId))
            }
            UpdateSupplierInvoiceLineError::NumberOfPacksBelowOne => {
                OutError::RangeError(RangeError {
                    field: RangeField::NumberOfPacks,
                    range: Range::Min(1),
                })
            }
            UpdateSupplierInvoiceLineError::PackSizeBelowOne => OutError::RangeError(RangeError {
                field: RangeField::PackSize,
                range: Range::Min(1),
            }),
            UpdateSupplierInvoiceLineError::BatchIsReserved => {
                OutError::BatchIsReserved(BatchIsReserved {})
            }
            UpdateSupplierInvoiceLineError::NotThisInvoiceLine(invoice_id) => {
                OutError::InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice(
                    invoice_id,
                ))
            }
        };

        UpdateSupplierInvoiceLineResponse::Error(ErrorWrapper { error })
    }
}
