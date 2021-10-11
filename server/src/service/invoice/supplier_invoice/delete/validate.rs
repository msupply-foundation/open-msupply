use crate::{
    database::{
        repository::{InvoiceLineQueryRepository, StorageConnection},
        schema::InvoiceRow,
    },
    service::invoice::{
        check_invoice_exists, check_invoice_finalised, check_invoice_type, CommonErrors,
    },
};

use super::DeleteSupplierInvoiceError;

pub fn validate(
    id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceRow, DeleteSupplierInvoiceError> {
    let invoice = check_invoice_exists(&id, connection)?;

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice)?;
    check_invoice_finalised(&invoice)?;
    check_lines_exist(id, connection)?;

    Ok(invoice)
}

pub fn check_lines_exist(
    id: &str,
    connection: &StorageConnection,
) -> Result<(), DeleteSupplierInvoiceError> {
    let lines =
        InvoiceLineQueryRepository::new(connection).find_many_by_invoice_ids(&[id.to_string()])?;

    if lines.len() > 0 {
        Err(DeleteSupplierInvoiceError::InvoiceLinesExists(lines))
    } else {
        Ok(())
    }
}

impl From<CommonErrors> for DeleteSupplierInvoiceError {
    fn from(error: CommonErrors) -> Self {
        use DeleteSupplierInvoiceError::*;
        match error {
            CommonErrors::InvoiceDoesNotExists => InvoiceDoesNotExists,
            CommonErrors::DatabaseError(error) => DatabaseError(error),
            CommonErrors::InvoiceIsFinalised => CannotEditFinalised,
            CommonErrors::NotASupplierInvoice => NotASupplierInvoice,
        }
    }
}
