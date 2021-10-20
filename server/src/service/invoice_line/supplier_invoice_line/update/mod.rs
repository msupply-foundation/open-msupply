use crate::{
    database::repository::{
        InvoiceLineRepository, RepositoryError, StockLineRepository, StorageConnectionManager,
        TransactionError,
    },
    domain::supplier_invoice::UpdateSupplierInvoiceLine,
    service::WithDBError,
};

mod generate;
mod validate;

use generate::generate;
use validate::validate;

pub fn update_supplier_invoice_line(
    connection_manager: &StorageConnectionManager,
    input: UpdateSupplierInvoiceLine,
) -> Result<String, UpdateSupplierInvoiceLineError> {
    let connection = connection_manager.connection()?;
    let updated_line = connection
        .transaction_sync(|connection| {
            let (line, item, invoice) = validate(&input, &connection)?;

            let (updated_line, upsert_batch_option, delete_batch_id_option) =
                generate(input, line, item, invoice, &connection)?;

            let stock_line_respository = StockLineRepository::new(&connection);

            if let Some(upsert_batch) = upsert_batch_option {
                stock_line_respository.upsert_one(&upsert_batch)?;
            }

            InvoiceLineRepository::new(&connection).upsert_one(&updated_line)?;

            if let Some(id) = delete_batch_id_option {
                stock_line_respository.delete(&id)?;
            }
            Ok(updated_line)
        })
        .map_err(
            |error: TransactionError<UpdateSupplierInvoiceLineError>| match error {
                TransactionError::Transaction { msg } => RepositoryError::DBError { msg }.into(),
                TransactionError::Inner(error) => error,
            },
        )?;
    Ok(updated_line.id)
}
pub enum UpdateSupplierInvoiceLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotASupplierInvoice,
    NotThisStoreInvoice,
    CannotEditFinalised,
    ItemNotFound,
    PackSizeBelowOne,
    NumberOfPacksBelowOne,
    BatchIsReserved,
    NotThisInvoiceLine(String),
}

impl From<RepositoryError> for UpdateSupplierInvoiceLineError {
    fn from(error: RepositoryError) -> Self {
        UpdateSupplierInvoiceLineError::DatabaseError(error)
    }
}

impl<ERR> From<WithDBError<ERR>> for UpdateSupplierInvoiceLineError
where
    ERR: Into<UpdateSupplierInvoiceLineError>,
{
    fn from(result: WithDBError<ERR>) -> Self {
        match result {
            WithDBError::DatabaseError(error) => error.into(),
            WithDBError::Error(error) => error.into(),
        }
    }
}
