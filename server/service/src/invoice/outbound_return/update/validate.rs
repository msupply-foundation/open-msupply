use repository::{InvoiceRow, InvoiceRowType, StorageConnection};

use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_type, check_store,
};

use super::UpdateOutboundReturnError;

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    id: &str,
) -> Result<(InvoiceRow, bool), UpdateOutboundReturnError> {
    use UpdateOutboundReturnError::*;

    let return_row = check_invoice_exists(id, connection)?.ok_or(ReturnDoesNotExist)?;

    if !check_store(&return_row, store_id) {
        return Err(ReturnDoesNotBelongToCurrentStore);
    }
    if !check_invoice_is_editable(&return_row) {
        return Err(ReturnIsNotEditable);
    }
    if !check_invoice_type(&return_row, InvoiceRowType::OutboundReturn) {
        return Err(NotAnOutboundReturn);
    }

    // TODO: Status check
    let status_changed = false;

    Ok((return_row, status_changed))
}
