use crate::{
    database::repository::{
        InvoiceLineRepository, RepositoryError, StockLineRepository, StorageConnectionManager,
    },
    domain::supplier_invoice::InsertSupplierInvoiceLine,
    service::WithDBError,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

pub fn insert_supplier_invoice_line(
    connection_manager: &StorageConnectionManager,
    input: InsertSupplierInvoiceLine,
) -> Result<String, InsertSupplierInvoiceLineError> {
    let connection = connection_manager.connection()?;
    // TODO do inside transaction
    let (item, invoice) = validate(&input, &connection)?;
    let (new_line, new_batch_option) = generate(input, item, invoice, &connection)?;

    if let Some(new_batch) = new_batch_option {
        StockLineRepository::new(&connection).upsert_one(&new_batch)?;
    }
    InvoiceLineRepository::new(&connection).upsert_one(&new_line)?;

    Ok(new_line.id)
}

pub enum InsertSupplierInvoiceLineError {
    LineAlreadyExists,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotASupplierInvoice,
    NotThisStoreInvoice,
    CannotEditFinalised,
    ItemNotFound,
    PackSizeBelowOne,
    NumberOfPacksBelowOne,
}

impl From<RepositoryError> for InsertSupplierInvoiceLineError {
    fn from(error: RepositoryError) -> Self {
        InsertSupplierInvoiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for InsertSupplierInvoiceLineError
where
    ERR: Into<InsertSupplierInvoiceLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
