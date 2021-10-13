use crate::{
    server::service::graphql::schema::{
        mutations::{
            CannotDeleteInvoiceWithLines, CannotEditFinalisedInvoice, DeleteResponse,
            InvoiceDoesNotBelongToCurrentStore, RecordDoesNotExist,
        },
        types::{DatabaseError, ErrorWrapper},
    },
    service::invoice::DeleteCustomerInvoiceError,
};

use async_graphql::{Interface, Union};

#[derive(Union)]
pub enum DeleteCustomerInvoiceResponse {
    Error(ErrorWrapper<DeleteCustomerInvoiceErrorInterface>),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteCustomerInvoiceErrorInterface {
    RecordDoesNotExist(RecordDoesNotExist),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
    CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines),
    DatabaseError(DatabaseError),
}

impl From<Result<String, DeleteCustomerInvoiceError>> for DeleteCustomerInvoiceResponse {
    fn from(result: Result<String, DeleteCustomerInvoiceError>) -> Self {
        match result {
            Ok(id) => DeleteCustomerInvoiceResponse::Response(DeleteResponse(id)),
            Err(error) => error.into(),
        }
    }
}

impl From<DeleteCustomerInvoiceError> for DeleteCustomerInvoiceResponse {
    fn from(error: DeleteCustomerInvoiceError) -> Self {
        use DeleteCustomerInvoiceErrorInterface as OutError;
        let error = match error {
            DeleteCustomerInvoiceError::InvoiceDoesNotExists => {
                OutError::RecordDoesNotExist(RecordDoesNotExist {})
            }
            DeleteCustomerInvoiceError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
            DeleteCustomerInvoiceError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            DeleteCustomerInvoiceError::InvoiceLinesExists(lines) => {
                OutError::CannotDeleteInvoiceWithLines(CannotDeleteInvoiceWithLines(lines.into()))
            }
            DeleteCustomerInvoiceError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
        };

        DeleteCustomerInvoiceResponse::Error(ErrorWrapper { error })
    }
}
