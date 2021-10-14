use crate::{
    database::repository::{InvoiceLineRepository, RepositoryError, StorageConnectionManager},
    domain::customer_invoice::InsertCustomerInvoiceLine,
    service::WithDBError,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

pub fn insert_customer_invoice_line(
    connection_manager: &StorageConnectionManager,
    input: InsertCustomerInvoiceLine,
) -> Result<String, InsertCustomerInvoiceLineError> {
    let connection = connection_manager.connection()?;
    // TODO do inside transaction
    let (item, invoice, batch) = validate(&input, &connection)?;
    let new_line = generate(input, item, batch, invoice)?;
    InvoiceLineRepository::new(&connection).upsert_one(&new_line)?;

    Ok(new_line.id)
}

pub enum InsertCustomerInvoiceLineError {
    LineAlreadyExists,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotACustomerInvoice,
    NotThisStoreInvoice,
    CannotEditFinalised,
    ItemNotFound,
    StockLineNotFound,
    NumberOfPacksBelowOne,
}

impl From<RepositoryError> for InsertCustomerInvoiceLineError {
    fn from(error: RepositoryError) -> Self {
        InsertCustomerInvoiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertCustomerInvoiceLineError
where
    ERR: Into<InsertCustomerInvoiceLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
