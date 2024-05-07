use repository::{InvoiceRow, InvoiceType, StorageConnection};

use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_status, check_invoice_type,
    check_status_change, check_store, InvoiceRowStatusError,
};

use super::{UpdateOutboundReturn, UpdateOutboundReturnError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    input: &UpdateOutboundReturn,
) -> Result<(InvoiceRow, bool), UpdateOutboundReturnError> {
    use UpdateOutboundReturnError::*;

    let return_row =
        check_invoice_exists(&input.outbound_return_id, connection)?.ok_or(ReturnDoesNotExist)?;

    if !check_store(&return_row, store_id) {
        return Err(ReturnDoesNotBelongToCurrentStore);
    }
    if !check_invoice_is_editable(&return_row) {
        return Err(ReturnIsNotEditable);
    }
    if !check_invoice_type(&return_row, InvoiceType::OutboundReturn) {
        return Err(NotAnOutboundReturn);
    }

    // Status check
    let status_changed = check_status_change(&return_row, input.full_status());
    if status_changed {
        check_invoice_status(&return_row, input.full_status(), &input.on_hold).map_err(
            |e| match e {
                InvoiceRowStatusError::CannotChangeStatusOfInvoiceOnHold => {
                    CannotChangeStatusOfInvoiceOnHold
                }
                InvoiceRowStatusError::CannotReverseInvoiceStatus => CannotReverseInvoiceStatus,
            },
        )?;
    }
    Ok((return_row, status_changed))
}
