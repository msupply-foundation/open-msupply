use crate::{
    database::{
        repository::{InvoiceLineQueryRepository, StorageConnection},
        schema::InvoiceRow,
    },
    domain::supplier_invoice::DeleteSupplierInvoice,
    service::invoice::{
        check_invoice_exists, check_invoice_finalised, check_invoice_type, CommonError,
    },
};

use super::DeleteSupplierInvoiceError;

pub fn validate(
    input: &DeleteSupplierInvoice,
    connection: &StorageConnection,
) -> Result<InvoiceRow, DeleteSupplierInvoiceError> {
    let invoice = check_invoice_exists(&input.id, connection)?;

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice)?;
    check_invoice_finalised(&invoice)?;
    check_lines_exist(&input.id, connection)?;

    Ok(invoice)
}

fn check_lines_exist(
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

impl From<CommonError> for DeleteSupplierInvoiceError {
    fn from(error: CommonError) -> Self {
        use DeleteSupplierInvoiceError::*;
        match error {
            CommonError::InvoiceDoesNotExists => InvoiceDoesNotExists,
            CommonError::DatabaseError(error) => DatabaseError(error),
            CommonError::InvoiceIsFinalised => CannotEditFinalised,
            CommonError::NotASupplierInvoice => NotASupplierInvoice,
        }
    }
}
