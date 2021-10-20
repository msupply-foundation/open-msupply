use crate::{
    database::repository::{
        InvoiceLineRepository, RepositoryError, StockLineRepository, StorageConnectionManager,
        TransactionError,
    },
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
    let new_line = connection
        .transaction_sync(|connection| {
            let (item, invoice, batch) = validate(&input, &connection)?;
            let (new_line, update_batch) = generate(input, item, batch, invoice)?;
            InvoiceLineRepository::new(&connection).upsert_one(&new_line)?;
            StockLineRepository::new(&connection).upsert_one(&update_batch)?;
            Ok(new_line)
        })
        .map_err(
            |error: TransactionError<InsertCustomerInvoiceLineError>| match error {
                TransactionError::Transaction { msg } => RepositoryError::DBError { msg }.into(),
                TransactionError::Inner(error) => error,
            },
        )?;
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
    StockLineAlreadyExistsInInvoice(String),
    ItemDoesNotMatchStockLine,
    ReductionBelowZero { stock_line_id: String },
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
