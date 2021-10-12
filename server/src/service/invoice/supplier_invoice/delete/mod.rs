use crate::{
    database::repository::{InvoiceRepository, RepositoryError, StorageConnectionManager},
    domain::{invoice_line::InvoiceLine, supplier_invoice::DeleteSupplierInvoice},
};

mod validate;

use validate::validate;

pub fn delete_supplier_invoice(
    connection_manager: &StorageConnectionManager,
    input: DeleteSupplierInvoice,
) -> Result<String, DeleteSupplierInvoiceError> {
    let connection = connection_manager.connection()?;
    // TODO do inside transaction
    validate(&input, &connection)?;

    InvoiceRepository::new(&connection).delete(&input.id)?;

    Ok(input.id)
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
