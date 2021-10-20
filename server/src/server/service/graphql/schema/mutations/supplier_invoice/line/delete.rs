use async_graphql::*;

use crate::{
    domain::supplier_invoice::DeleteSupplierInvoiceLine,
    server::service::graphql::schema::{
        mutations::{
            CannotEditFinalisedInvoice, DeleteResponse, ForeignKey, ForeignKeyError,
            InvoiceDoesNotBelongToCurrentStore, NotASupplierInvoice, RecordDoesNotExist,
        },
        types::{DatabaseError, ErrorWrapper},
    },
    service::invoice_line::DeleteSupplierInvoiceLineError,
};

use super::{BatchIsReserved, InvoiceLineBelongsToAnotherInvoice};

#[derive(InputObject)]
pub struct DeleteSupplierInvoiceLineInput {
    pub id: String,
    pub invoice_id: String,
}

#[derive(Union)]
pub enum DeleteSupplierInvoiceLineResponse {
    Error(ErrorWrapper<DeleteSupplierInvoiceLineErrorInterface>),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteSupplierInvoiceLineErrorInterface {
    DatabaseError(DatabaseError),
    RecordDoesNotExist(RecordDoesNotExist),
    ForeignKeyError(ForeignKeyError),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotASupplierInvoice(NotASupplierInvoice),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    BatchIsReserved(BatchIsReserved),
}

impl From<DeleteSupplierInvoiceLineInput> for DeleteSupplierInvoiceLine {
    fn from(input: DeleteSupplierInvoiceLineInput) -> Self {
        DeleteSupplierInvoiceLine {
            id: input.id,
            invoice_id: input.invoice_id,
        }
    }
}

impl From<Result<String, DeleteSupplierInvoiceLineError>> for DeleteSupplierInvoiceLineResponse {
    fn from(result: Result<String, DeleteSupplierInvoiceLineError>) -> Self {
        match result {
            Ok(id) => DeleteSupplierInvoiceLineResponse::Response(DeleteResponse(id)),
            Err(error) => error.into(),
        }
    }
}

impl From<DeleteSupplierInvoiceLineError> for DeleteSupplierInvoiceLineResponse {
    fn from(error: DeleteSupplierInvoiceLineError) -> Self {
        use DeleteSupplierInvoiceLineErrorInterface as OutError;
        let error = match error {
            DeleteSupplierInvoiceLineError::LineDoesNotExist => {
                OutError::RecordDoesNotExist(RecordDoesNotExist {})
            }
            DeleteSupplierInvoiceLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            DeleteSupplierInvoiceLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            DeleteSupplierInvoiceLineError::NotASupplierInvoice => {
                OutError::NotASupplierInvoice(NotASupplierInvoice {})
            }
            DeleteSupplierInvoiceLineError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            DeleteSupplierInvoiceLineError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }

            DeleteSupplierInvoiceLineError::BatchIsReserved => {
                OutError::BatchIsReserved(BatchIsReserved {})
            }
            DeleteSupplierInvoiceLineError::NotThisInvoiceLine(invoice_id) => {
                OutError::InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice(
                    invoice_id,
                ))
            }
        };

        DeleteSupplierInvoiceLineResponse::Error(ErrorWrapper { error })
    }
}
