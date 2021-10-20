use crate::{
    database::repository::{
        InvoiceRepository, RepositoryError, StorageConnectionManager, TransactionError,
    },
    domain::{customer_invoice::InsertCustomerInvoice, name::Name},
};

pub mod generate;
pub mod validate;

use generate::generate;
use validate::validate;

pub enum InsertCustomerInvoiceError {
    OtherPartyCannotBeThisStore,
    OtherPartyIdNotFound(String),
    OtherPartyNotACustomer(Name),
    InvoiceAlreadyExists,
    DatabaseError(RepositoryError),
}

impl From<RepositoryError> for InsertCustomerInvoiceError {
    fn from(error: RepositoryError) -> Self {
        InsertCustomerInvoiceError::DatabaseError(error)
    }
}

/// Insert a new customer invoice and returns the invoice id when successful.
pub fn insert_customer_invoice(
    connection_manager: &StorageConnectionManager,
    input: InsertCustomerInvoice,
) -> Result<String, InsertCustomerInvoiceError> {
    let connection = connection_manager.connection()?;

    let new_invoice_id = connection
        .transaction_sync(|connection| {
            validate(&input, &connection)?;
            let new_invoice = generate(input, &connection)?;
            InvoiceRepository::new(&connection).upsert_one(&new_invoice)?;

            Ok(new_invoice.id)
        })
        .map_err(
            |error: TransactionError<InsertCustomerInvoiceError>| match error {
                TransactionError::Transaction { msg } => RepositoryError::DBError { msg }.into(),
                TransactionError::Inner(error) => error,
            },
        )?;

    Ok(new_invoice_id)
}
