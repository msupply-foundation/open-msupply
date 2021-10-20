use crate::{
    database::{
        repository::{
            InvoiceLineRepository, InvoiceRepository, RepositoryError, StockLineRepository,
            StorageConnectionManager, TransactionError,
        },
        schema::InvoiceRowStatus,
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

    let line = connection
        .transaction_sync(|connection| {
            let line = validate(&input, &connection)?;
            let stock_line_id_option = line.stock_line_id.clone();

            InvoiceLineRepository::new(&connection).delete(&line.id)?;

            if let Some(stock_line_id) = stock_line_id_option {
                let invoice_repository = InvoiceRepository::new(&connection);
                let stock_line_repository = StockLineRepository::new(&connection);

                let mut stock_line = stock_line_repository.find_one_by_id(&stock_line_id)?;
                stock_line.available_number_of_packs += line.number_of_packs;

                let invoice = invoice_repository.find_one_by_id(&line.invoice_id)?;
                if invoice.status == InvoiceRowStatus::Confirmed {
                    stock_line.total_number_of_packs += line.number_of_packs;
                }

                stock_line_repository.upsert_one(&stock_line)?;
            }
            Ok(line)
        })
        .map_err(
            |error: TransactionError<DeleteCustomerInvoiceLineError>| match error {
                TransactionError::Transaction { msg } => RepositoryError::DBError { msg }.into(),
                TransactionError::Inner(error) => error,
            },
        )?;
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
