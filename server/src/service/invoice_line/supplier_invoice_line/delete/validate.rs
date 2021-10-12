use crate::{
    database::{repository::StorageConnection, schema::InvoiceLineRow},
    domain::supplier_invoice::DeleteSupplierInvoiceLine,
    service::{
        invoice::{
            check_invoice_exists, check_invoice_finalised, check_invoice_type,
            CommonError as CommonInvoiceError,
        },
        invoice_line::{
            supplier_invoice_line::{
                check_batch, check_line_belongs_to_invoice, check_line_exists,
            },
            InsertAndDeleteError,
        },
    },
};

use super::DeleteSupplierInvoiceLineError;

pub fn validate(
    input: &DeleteSupplierInvoiceLine,
    connection: &StorageConnection,
) -> Result<InvoiceLineRow, DeleteSupplierInvoiceLineError> {
    let line = check_line_exists(&input.id, connection)?;

    let invoice = check_invoice_exists(&input.invoice_id, connection)?;
    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_line_belongs_to_invoice(&line, &invoice)?;
    check_invoice_type(&invoice)?;
    check_invoice_finalised(&invoice)?;
    check_batch(&line, connection)?;

    Ok(line)
}

impl From<CommonInvoiceError> for DeleteSupplierInvoiceLineError {
    fn from(error: CommonInvoiceError) -> Self {
        use DeleteSupplierInvoiceLineError::*;
        match error {
            CommonInvoiceError::InvoiceDoesNotExists => InvoiceDoesNotExist,
            CommonInvoiceError::DatabaseError(error) => DatabaseError(error),
            CommonInvoiceError::InvoiceIsFinalised => CannotEditFinalised,
            CommonInvoiceError::NotASupplierInvoice => NotASupplierInvoice,
        }
    }
}

impl From<InsertAndDeleteError> for DeleteSupplierInvoiceLineError {
    fn from(error: InsertAndDeleteError) -> Self {
        use DeleteSupplierInvoiceLineError::*;
        match error {
            InsertAndDeleteError::LineDoesNotExist => LineDoesNotExist,
            InsertAndDeleteError::NotInvoiceLine(invoice_id) => NotThisInvoiceLine(invoice_id),
            InsertAndDeleteError::DatabaseError(error) => DatabaseError(error),
            InsertAndDeleteError::BatchIsReserved => BatchIsReserved,
        }
    }
}
