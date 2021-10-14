use crate::{
    database::repository::{InvoiceLineRepository, RepositoryError, StorageConnectionManager},
    domain::customer_invoice::UpdateCustomerInvoiceLine,
    service::WithDBError,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

pub fn update_customer_invoice_line(
    connection_manager: &StorageConnectionManager,
    input: UpdateCustomerInvoiceLine,
) -> Result<String, UpdateCustomerInvoiceLineError> {
    let connection = connection_manager.connection()?;
    // TODO do inside transaction
    let (line, item, invoice, batch) = validate(&input, &connection)?;
    let new_line = generate(input, line, item, batch, invoice)?;
    InvoiceLineRepository::new(&connection).upsert_one(&new_line)?;

    Ok(new_line.id)
}

pub enum UpdateCustomerInvoiceLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotACustomerInvoice,
    NotThisStoreInvoice,
    CannotEditFinalised,
    ItemNotFound,
    StockLineNotFound,
    NumberOfPacksBelowOne,
    ItemDoesNotMatchStockLine,
    LineDoesntReferenceStockLine,
    StockLineAlreadyExistsInInvoice(String),
}

impl From<RepositoryError> for UpdateCustomerInvoiceLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateCustomerInvoiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdateCustomerInvoiceLineError
where
    ERR: Into<UpdateCustomerInvoiceLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
