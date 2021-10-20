use crate::{
    database::repository::{
        InvoiceLineRepository, RepositoryError, StockLineRepository, StorageConnectionManager,
        TransactionError,
    },
    domain::supplier_invoice::DeleteSupplierInvoiceLine,
    service::WithDBError,
};

mod validate;

use validate::validate;

pub fn delete_supplier_invoice_line(
    connection_manager: &StorageConnectionManager,
    input: DeleteSupplierInvoiceLine,
) -> Result<String, DeleteSupplierInvoiceLineError> {
    let connection = connection_manager.connection()?;
    let line = connection
        .transaction_sync(|connection| {
            let line = validate(&input, &connection)?;

            let delete_batch_id_option = line.stock_line_id.clone();

            InvoiceLineRepository::new(&connection).delete(&line.id)?;

            if let Some(id) = delete_batch_id_option {
                StockLineRepository::new(&connection).delete(&id)?;
            }
            Ok(line)
        })
        .map_err(
            |error: TransactionError<DeleteSupplierInvoiceLineError>| match error {
                TransactionError::Transaction { msg } => {
                    RepositoryError::as_db_error(&msg, "").into()
                }
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(line.id)
}
pub enum DeleteSupplierInvoiceLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotASupplierInvoice,
    NotThisStoreInvoice,
    CannotEditFinalised,
    BatchIsReserved,
    NotThisInvoiceLine(String),
}

impl From<RepositoryError> for DeleteSupplierInvoiceLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteSupplierInvoiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for DeleteSupplierInvoiceLineError
where
    ERR: Into<DeleteSupplierInvoiceLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
