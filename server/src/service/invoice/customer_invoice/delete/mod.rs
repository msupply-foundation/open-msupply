use crate::{
    database::repository::{
        InvoiceRepository, RepositoryError, StorageConnectionManager, TransactionError,
    },
    domain::invoice_line::InvoiceLine,
};

pub mod validate;

use validate::validate;

pub fn delete_customer_invoice(
    connection_manager: &StorageConnectionManager,
    id: String,
) -> Result<String, DeleteCustomerInvoiceError> {
    let connection = connection_manager.connection()?;
    connection.transaction_sync(|connection| {
        validate(&id, &connection)?;
        InvoiceRepository::new(&connection).delete(&id)?;
        Ok(())
    })?;
    Ok(id)
}

pub enum DeleteCustomerInvoiceError {
    InvoiceDoesNotExists,
    DatabaseError(RepositoryError),
    NotThisStoreInvoice,
    CannotEditFinalised,
    InvoiceLinesExists(Vec<InvoiceLine>),
    NotACustomerInvoice,
}

impl From<RepositoryError> for DeleteCustomerInvoiceError {
    fn from(error: RepositoryError) -> Self {
        DeleteCustomerInvoiceError::DatabaseError(error)
    }
}

impl From<TransactionError<DeleteCustomerInvoiceError>> for DeleteCustomerInvoiceError {
    fn from(error: TransactionError<DeleteCustomerInvoiceError>) -> Self {
        match error {
            TransactionError::Transaction { msg } => {
                DeleteCustomerInvoiceError::DatabaseError(RepositoryError::DBError {
                    msg,
                    extra: "".to_string(),
                })
            }
            TransactionError::Inner(e) => e,
        }
    }
}
