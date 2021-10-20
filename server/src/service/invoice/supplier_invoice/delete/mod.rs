use crate::{
    database::repository::{
        InvoiceRepository, RepositoryError, StorageConnectionManager, TransactionError,
    },
    domain::{invoice_line::InvoiceLine, supplier_invoice::DeleteSupplierInvoice},
    service::WithDBError,
};

mod validate;

use validate::validate;

pub fn delete_supplier_invoice(
    connection_manager: &StorageConnectionManager,
    input: DeleteSupplierInvoice,
) -> Result<String, DeleteSupplierInvoiceError> {
    let connection = connection_manager.connection()?;
    connection
        .transaction_sync(|connection| {
            validate(&input, &connection)?;
            InvoiceRepository::new(&connection).delete(&input.id)?;
            Ok(())
        })
        .map_err(
            |error: TransactionError<DeleteSupplierInvoiceError>| match error {
                TransactionError::Transaction { msg } => RepositoryError::DBError { msg }.into(),
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(input.id)
}

pub enum DeleteSupplierInvoiceError {
    InvoiceDoesNotExist,
    DatabaseError(RepositoryError),
    NotASupplierInvoice,
    NotThisStoreInvoice,
    CannotEditFinalised,
    InvoiceLinesExists(Vec<InvoiceLine>),
}

impl From<RepositoryError> for DeleteSupplierInvoiceError {
    fn from(error: RepositoryError) -> Self {
        DeleteSupplierInvoiceError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for DeleteSupplierInvoiceError
where
    ERR: Into<DeleteSupplierInvoiceError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
