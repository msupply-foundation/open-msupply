use crate::{
    database::repository::{
        InvoiceRepository, RepositoryError, StockLineRepository, StorageConnectionManager,
        TransactionError,
    },
    domain::{customer_invoice::UpdateCustomerInvoice, name::Name},
};

pub mod generate;
pub mod validate;

use generate::generate;
use validate::validate;

pub fn update_customer_invoice(
    connection_manager: &StorageConnectionManager,
    patch: UpdateCustomerInvoice,
) -> Result<String, UpdateCustomerInvoiceError> {
    let connection = connection_manager.connection()?;
    let updated_invoice_id = connection.transaction_sync(|connection| {
        let invoice = validate(&patch, &connection)?;
        let invoice_id = invoice.id.to_owned();
        let (stock_lines_option, update_invoice) = generate(invoice, patch, &connection)?;

        InvoiceRepository::new(&connection).upsert_one(&update_invoice)?;
        if let Some(stock_lines) = stock_lines_option {
            let repository = StockLineRepository::new(&connection);
            for stock_line in stock_lines {
                repository.upsert_one(&stock_line)?;
            }
        }
        Ok(invoice_id)
    })?;

    Ok(updated_invoice_id)
}

pub enum UpdateCustomerInvoiceError {
    CannotChangeInvoiceBackToDraft,
    InvoiceDoesNotExists,
    InvoiceIsFinalised,
    DatabaseError(RepositoryError),
    OtherPartyDoesNotExists,
    OtherPartyNotACustomer(Name),
    OtherPartyCannotBeThisStore,
    NotACustomerInvoice,
    /// Holds the id of the invalid invoice line
    InvoiceLineHasNoStockLine(String),
}

impl From<RepositoryError> for UpdateCustomerInvoiceError {
    fn from(error: RepositoryError) -> Self {
        UpdateCustomerInvoiceError::DatabaseError(error)
    }
}

impl From<TransactionError<UpdateCustomerInvoiceError>> for UpdateCustomerInvoiceError {
    fn from(error: TransactionError<UpdateCustomerInvoiceError>) -> Self {
        match error {
            TransactionError::Transaction { msg } => {
                UpdateCustomerInvoiceError::DatabaseError(RepositoryError::DBError { msg })
            }
            TransactionError::Inner(e) => e,
        }
    }
}
