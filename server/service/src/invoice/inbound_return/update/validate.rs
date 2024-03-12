use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_status, check_invoice_type,
    check_status_change, check_store, InvoiceRowStatusError,
};
use repository::{InvoiceRow, InvoiceRowType, StorageConnection};

use super::{UpdateInboundReturn, UpdateInboundReturnError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    patch: &UpdateInboundReturn,
) -> Result<(InvoiceRow, bool), UpdateInboundReturnError> {
    use UpdateInboundReturnError::*;

    let return_row = check_invoice_exists(&patch.id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&return_row, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_is_editable(&return_row) {
        return Err(ReturnIsNotEditable);
    }
    if !check_invoice_type(&return_row, InvoiceRowType::InboundReturn) {
        return Err(NotAnInboundReturn);
    }

    // Status check
    let status_changed = check_status_change(&return_row, patch.invoice_row_status_option());
    if status_changed {
        let on_hold_input = None;
        check_invoice_status(
            &return_row,
            patch.invoice_row_status_option(),
            &on_hold_input,
        )
        .map_err(|e| match e {
            InvoiceRowStatusError::CannotChangeStatusOfInvoiceOnHold => {
                CannotChangeStatusOfInvoiceOnHold
            }
            InvoiceRowStatusError::CannotReverseInvoiceStatus => CannotReverseInvoiceStatus,
        })?;
    }

    Ok((return_row, status_changed))
}
