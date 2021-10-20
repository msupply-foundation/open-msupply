use crate::{
    database::{
        repository::{InvoiceLineQueryRepository, StorageConnection},
        schema::InvoiceRow,
    },
    domain::{invoice::InvoiceType, supplier_invoice::DeleteSupplierInvoice},
    service::invoice::{
        check_invoice_exists, check_invoice_finalised, check_invoice_type, InvoiceDoesNotExist,
        InvoiceIsFinalised, WrongInvoiceType,
    },
};

use super::DeleteSupplierInvoiceError;

pub fn validate(
    input: &DeleteSupplierInvoice,
    connection: &StorageConnection,
) -> Result<InvoiceRow, DeleteSupplierInvoiceError> {
    let invoice = check_invoice_exists(&input.id, connection)?;

    // check_store(invoice, connection)?; InvoiceDoesNotBelongToCurrentStore
    check_invoice_type(&invoice, InvoiceType::SupplierInvoice)?;
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

impl From<WrongInvoiceType> for DeleteSupplierInvoiceError {
    fn from(_: WrongInvoiceType) -> Self {
        DeleteSupplierInvoiceError::NotASupplierInvoice
    }
}

impl From<InvoiceIsFinalised> for DeleteSupplierInvoiceError {
    fn from(_: InvoiceIsFinalised) -> Self {
        DeleteSupplierInvoiceError::CannotEditFinalised
    }
}

impl From<InvoiceDoesNotExist> for DeleteSupplierInvoiceError {
    fn from(_: InvoiceDoesNotExist) -> Self {
        DeleteSupplierInvoiceError::InvoiceDoesNotExist
    }
}
