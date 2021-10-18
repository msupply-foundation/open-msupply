use crate::{
    database::{
        repository::{
            InvoiceLineRepository, InvoiceRepository, RepositoryError, StockLineRepository,
            StorageConnectionManager,
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
    // TODO: do inside transaction
    let line = validate(&input, &connection)?;

    let delete_batch_id_option = line.stock_line_id.clone();

    InvoiceLineRepository::new(&connection).delete(&line.id)?;

    if let Some(delete_batch_id) = delete_batch_id_option {
        let invoice = InvoiceRepository::new(&connection).find_one_by_id(&line.invoice_id)?;

        let stock_line_repository = StockLineRepository::new(&connection);

        let mut stock_line = stock_line_repository.find_one_by_id(&delete_batch_id)?;

        stock_line.available_number_of_packs += line.number_of_packs;

        if invoice.status == InvoiceRowStatus::Confirmed {
            stock_line.total_number_of_packs += line.number_of_packs;
        }

        stock_line_repository.upsert_one(&stock_line)?;
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
