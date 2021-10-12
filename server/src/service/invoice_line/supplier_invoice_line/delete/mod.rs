use crate::{
    database::repository::{
        InvoiceLineRepository, RepositoryError, StockLineRepository, StorageConnectionManager,
    },
    domain::supplier_invoice::DeleteSupplierInvoiceLine,
};

mod validate;

use validate::validate;

pub fn delete_supplier_invoice_line(
    connection_manager: &StorageConnectionManager,
    input: DeleteSupplierInvoiceLine,
) -> Result<String, DeleteSupplierInvoiceLineError> {
    let connection = connection_manager.connection()?;
    // TODO do inside transaction
    let line = validate(&input, &connection)?;

    let delete_batch_id_option = line.stock_line_id.clone();

    InvoiceLineRepository::new(&connection).delete(&line.id)?;

    if let Some(id) = delete_batch_id_option {
        StockLineRepository::new(&connection).delete(&id)?;
    }

    Ok(line.id)
}
pub enum DeleteSupplierInvoiceLineError {
    LineDoesNotExist,
    DatabaseError(RepositoryError),
    InvoiceDoesNotExist,
    NotASupplierInvoice,
    NotThisStoreInvoice,
    CannotEditFinalised,
    BatchIsReserved,
    NotThisInvoiceLine(String),
}

impl From<RepositoryError> for DeleteSupplierInvoiceLineError {
    fn from(error: RepositoryError) -> Self {
        DeleteSupplierInvoiceLineError::DatabaseError(error)
    }
}
