use repository::{InvoiceType, StorageConnection};

use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store,
};

use super::UpdateCustomerReturnLinesError;

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
) -> Result<(), UpdateCustomerReturnLinesError> {
    use UpdateCustomerReturnLinesError::*;

    let return_row = check_invoice_exists(id, connection)?.ok_or(ReturnDoesNotExist)?;

    if !check_store(&return_row, store_id) {
        return Err(ReturnDoesNotBelongToCurrentStore);
    }
    if !check_invoice_is_editable(&return_row) {
        return Err(ReturnIsNotEditable);
    }
    if !check_invoice_type(&return_row, InvoiceType::CustomerReturn) {
        return Err(NotACustomerReturn);
    }

    Ok(())
}
