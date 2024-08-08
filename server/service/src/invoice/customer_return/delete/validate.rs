use super::DeleteCustomerReturnError;
use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store,
};
use repository::{InvoiceRow, InvoiceType, StorageConnection};

pub fn validate(
    id: &str,
    store_id: &str,
    connection: &StorageConnection,
) -> Result<InvoiceRow, DeleteCustomerReturnError> {
    use DeleteCustomerReturnError::*;

    let invoice = check_invoice_exists(id, connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if !check_invoice_type(&invoice, InvoiceType::CustomerReturn) {
        return Err(NotAnCustomerReturn);
    }

    Ok(invoice)
}
