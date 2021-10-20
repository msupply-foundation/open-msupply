use async_graphql::*;

use crate::{
    domain::customer_invoice::DeleteCustomerInvoiceLine,
    server::service::graphql::schema::{
        mutations::{
            CannotEditFinalisedInvoice, DeleteResponse, ForeignKey, ForeignKeyError,
            InvoiceDoesNotBelongToCurrentStore, InvoiceLineBelongsToAnotherInvoice,
            NotACustomerInvoice, RecordDoesNotExist,
        },
        types::{DatabaseError, ErrorWrapper},
    },
    service::invoice_line::DeleteCustomerInvoiceLineError,
};

#[derive(InputObject)]
pub struct DeleteCustomerInvoiceLineInput {
    pub id: String,
    pub invoice_id: String,
}

#[derive(Union)]
pub enum DeleteCustomerInvoiceLineResponse {
    Error(ErrorWrapper<DeleteCustomerInvoiceLineErrorInterface>),
    Response(DeleteResponse),
}

#[derive(Interface)]
#[graphql(field(name = "description", type = "&str"))]
pub enum DeleteCustomerInvoiceLineErrorInterface {
    DatabaseError(DatabaseError),
    RecordDoesNotExist(RecordDoesNotExist),
    ForeignKeyError(ForeignKeyError),
    CannotEditFinalisedInvoice(CannotEditFinalisedInvoice),
    NotACustomerInvoice(NotACustomerInvoice),
    InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice),
    InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore),
}

impl From<DeleteCustomerInvoiceLineInput> for DeleteCustomerInvoiceLine {
    fn from(input: DeleteCustomerInvoiceLineInput) -> Self {
        DeleteCustomerInvoiceLine {
            id: input.id,
            invoice_id: input.invoice_id,
        }
    }
}

impl From<Result<String, DeleteCustomerInvoiceLineError>> for DeleteCustomerInvoiceLineResponse {
    fn from(result: Result<String, DeleteCustomerInvoiceLineError>) -> Self {
        match result {
            Ok(id) => DeleteCustomerInvoiceLineResponse::Response(DeleteResponse(id)),
            Err(error) => error.into(),
        }
    }
}

impl From<DeleteCustomerInvoiceLineError> for DeleteCustomerInvoiceLineResponse {
    fn from(error: DeleteCustomerInvoiceLineError) -> Self {
        use DeleteCustomerInvoiceLineErrorInterface as OutError;
        let error = match error {
            DeleteCustomerInvoiceLineError::LineDoesNotExist => {
                OutError::RecordDoesNotExist(RecordDoesNotExist {})
            }
            DeleteCustomerInvoiceLineError::DatabaseError(error) => {
                OutError::DatabaseError(DatabaseError(error))
            }
            DeleteCustomerInvoiceLineError::InvoiceDoesNotExist => {
                OutError::ForeignKeyError(ForeignKeyError(ForeignKey::InvoiceId))
            }
            DeleteCustomerInvoiceLineError::NotACustomerInvoice => {
                OutError::NotACustomerInvoice(NotACustomerInvoice {})
            }
            DeleteCustomerInvoiceLineError::NotThisStoreInvoice => {
                OutError::InvoiceDoesNotBelongToCurrentStore(InvoiceDoesNotBelongToCurrentStore {})
            }
            DeleteCustomerInvoiceLineError::CannotEditFinalised => {
                OutError::CannotEditFinalisedInvoice(CannotEditFinalisedInvoice {})
            }
            DeleteCustomerInvoiceLineError::NotThisInvoiceLine(invoice_id) => {
                OutError::InvoiceLineBelongsToAnotherInvoice(InvoiceLineBelongsToAnotherInvoice(
                    invoice_id,
                ))
            }
        };

        DeleteCustomerInvoiceLineResponse::Error(ErrorWrapper { error })
    }
}
