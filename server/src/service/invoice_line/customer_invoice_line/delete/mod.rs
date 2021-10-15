use crate::{
    database::repository::{
        InvoiceLineRepository, RepositoryError, StockLineRepository, StorageConnectionManager,
    },
    domain::customer_invoice::DeleteCustomerInvoiceLine,
    service::WithDBError,
};

mod validate;

use validate::validate;

pub fn delete_customer_invoice_line(
    connection_manager: &StorageConnectionManager,
    input: DeleteCustomerInvoiceLine,
) -> Result<String, DeleteCustomerInvoiceLineError> {
    let connection = connection_manager.connection()?;
    // TODO: do inside transaction
    let line = validate(&input, &connection)?;

    let delete_batch_id_option = line.stock_line_id.clone();

    InvoiceLineRepository::new(&connection).delete(&line.id)?;

    if let Some(id) = delete_batch_id_option {
        StockLineRepository::new(&connection).delete(&id)?;
    }

    Ok(line.id)
}

pub enum DeleteCustomerInvoiceLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotACustomerInvoice,
    NotThisStoreInvoice,
    CannotEditFinalised,
    NotThisInvoiceLine(String),
}

impl From<RepositoryError> for DeleteCustomerInvoiceLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteCustomerInvoiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for DeleteCustomerInvoiceLineError
where
    ERR: Into<DeleteCustomerInvoiceLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
