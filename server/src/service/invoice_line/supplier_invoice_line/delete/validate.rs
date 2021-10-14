use crate::{
    database::{repository::StorageConnection, schema::InvoiceLineRow},
    domain::{invoice::InvoiceType, supplier_invoice::DeleteSupplierInvoiceLine},
    service::{
        invoice::{
            check_invoice_exists, check_invoice_finalised, check_invoice_type,
            validate::InvoiceIsFinalised, InvoiceDoesNotExist, WrongInvoiceType,
        },
        invoice_line::{
            supplier_invoice_line::check_batch,
            validate::{
                check_line_belongs_to_invoice, check_line_exists, LineDoesNotExist, NotInvoiceLine,
            },
            BatchIsReserved,
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
    check_invoice_type(&invoice, InvoiceType::SupplierInvoice)?;
    check_invoice_finalised(&invoice)?;
    check_batch(&line, connection)?;

    Ok(line)
}

impl From<LineDoesNotExist> for DeleteSupplierInvoiceLineError {
    fn from(_: LineDoesNotExist) -> Self {
        DeleteSupplierInvoiceLineError::LineDoesNotExist
    }
}

impl From<WrongInvoiceType> for DeleteSupplierInvoiceLineError {
    fn from(_: WrongInvoiceType) -> Self {
        DeleteSupplierInvoiceLineError::NotASupplierInvoice
    }
}

impl From<InvoiceIsFinalised> for DeleteSupplierInvoiceLineError {
    fn from(_: InvoiceIsFinalised) -> Self {
        DeleteSupplierInvoiceLineError::CannotEditFinalised
    }
}

impl From<NotInvoiceLine> for DeleteSupplierInvoiceLineError {
    fn from(error: NotInvoiceLine) -> Self {
        DeleteSupplierInvoiceLineError::NotThisInvoiceLine(error.0)
    }
}

impl From<BatchIsReserved> for DeleteSupplierInvoiceLineError {
    fn from(_: BatchIsReserved) -> Self {
        DeleteSupplierInvoiceLineError::BatchIsReserved
    }
}

impl From<InvoiceDoesNotExist> for DeleteSupplierInvoiceLineError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        DeleteSupplierInvoiceLineError::InvoiceDoesNotExist
    }
}
