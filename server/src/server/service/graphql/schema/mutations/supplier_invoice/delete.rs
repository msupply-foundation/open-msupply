use async_graphql::*;

use crate::{
    domain::supplier_invoice::DeleteSupplierInvoice,
    server::service::graphql::schema::{
        mutations::{
            CannotEditFinalisedInvoice, DeleteResponse, InvoiceDoesNotBelongToCurrentStore,
            NotASupplierInvoice, RecordDoesNotExist,
        },
        types::{DatabaseError, ErrorWrapper},
    },
    service::invoice::DeleteSupplierInvoiceError,
};

use super::CannotDeleteInvoiceWithLines;

#[derive(InputObject)]
pub struct DeleteSupplierInvoiceInput {
    id: String,
}

#[derive(Union)]
pub enum DeleteSupplierInvoiceResponse {
    Error(ErrorWrapper<DeleteSupplierInvoiceErrorInterface>),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteSupplierInvoiceErrorInterface {
    DatabaseError(DatabaseError),
    RecordDoesNotExist(RecordDoesNotExist),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotASupplierInvoice(NotASupplierInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
}

impl From<DeleteSupplierInvoiceInput> for DeleteSupplierInvoice {
    fn from(input: DeleteSupplierInvoiceInput) -> Self {
        DeleteSupplierInvoice { id: input.id }
    }
}

impl From<Result<String, DeleteSupplierInvoiceError>> for DeleteSupplierInvoiceResponse {
    fn from(result: Result<String, DeleteSupplierInvoiceError>) -> Self {
        match result {
            Ok(id) => DeleteSupplierInvoiceResponse::Response(DeleteResponse(id)),
            Err(error) => error.into(),
        }
    }
}

impl From<DeleteSupplierInvoiceError> for DeleteSupplierInvoiceResponse {
    fn from(error: DeleteSupplierInvoiceError) -> Self {
        use DeleteSupplierInvoiceErrorInterface as OutError;
        let error = match error {
            DeleteSupplierInvoiceError::InvoiceDoesNotExists => {
                OutError::RecordDoesNotExist(RecordDoesNotExist {})
            }
            DeleteSupplierInvoiceError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }

            DeleteSupplierInvoiceError::NotASupplierInvoice => {
                OutError::NotASupplierInvoice(NotASupplierInvoice {})
            }
            DeleteSupplierInvoiceError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            DeleteSupplierInvoiceError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
            DeleteSupplierInvoiceError::InvoiceLinesExists(lines) => {
                OutError::CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines(lines.into()))
            }
        };

        DeleteSupplierInvoiceResponse::Error(ErrorWrapper { error })
    }
}
