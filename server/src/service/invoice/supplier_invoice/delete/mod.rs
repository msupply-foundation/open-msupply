use crate::{
    database::repository::{InvoiceRepository, RepositoryError, StorageConnectionManager},
    domain::invoice_line::InvoiceLine,
};

mod validate;

use validate::validate;

pub fn delete_supplier_invoice(
    connection_manager: &StorageConnectionManager,
    id: String,
) -> Result<String, DeleteSupplierInvoiceError> {
    let connection = connection_manager.connection()?;
    // TODO do inside transaction
    validate(&id, &connection)?;

    InvoiceRepository::new(&connection).delete(&id)?;

    Ok(id)
}

pub enum DeleteSupplierInvoiceError {
    InvoiceDoesNotExists,
    DatabaseError(RepositoryError),
    NotASupplierInvoice,
    NotThisStoreInvoice,
    CannotEditFinalised,
    InvoiceLinesExists(Vec<InvoiceLine>),
}

impl From<RepositoryError> for DeleteSupplierInvoiceError {
    fn from(error: RepositoryError) -> Self {
        DeleteSupplierInvoiceError::DatabaseError(error)
    }
}
