use crate::{
    database::repository::{InvoiceRepository, RepositoryError, StorageConnectionManager},
    domain::{name::Name, supplier_invoice::InsertSupplierInvoice},
};

pub mod generate;
pub mod validate;

use generate::generate;
use validate::validate;

pub fn insert_supplier_invoice(
    connection_manager: &StorageConnectionManager,
    input: InsertSupplierInvoice,
) -> Result<String, InsertSupplierInvoiceError> {
    let connection = connection_manager.connection()?;
    // TODO do inside transaction
    validate(&input, &connection)?;
    let new_invoice = generate(input, &connection)?;
    InvoiceRepository::new(&connection).upsert_one(&new_invoice)?;

    Ok(new_invoice.id)
}

pub enum InsertSupplierInvoiceError {
    InvoiceAlreadyExists,
    DatabaseError(RepositoryError),
    OtherPartyDoesNotExists,
    OtherPartyNotASupplier(Name),
}

impl From<RepositoryError> for InsertSupplierInvoiceError {
    fn from(error: RepositoryError) -> Self {
        InsertSupplierInvoiceError::DatabaseError(error)
    }
}
