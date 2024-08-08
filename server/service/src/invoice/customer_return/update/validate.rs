use crate::{
    invoice::{
        check_invoice_exists, check_invoice_is_editable, check_invoice_status, check_invoice_type,
        check_status_change, check_store, InvoiceRowStatusError,
    },
    validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors},
};
use repository::{InvoiceRow, InvoiceType, Name, StorageConnection};

use super::{UpdateCustomerReturn, UpdateCustomerReturnError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    patch: &UpdateCustomerReturn,
) -> Result<(InvoiceRow, Option<Name>, bool), UpdateCustomerReturnError> {
    use UpdateCustomerReturnError::*;

    let return_row = check_invoice_exists(&patch.id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&return_row, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_is_editable(&return_row) {
        return Err(ReturnIsNotEditable);
    }
    if !check_invoice_type(&return_row, InvoiceType::CustomerReturn) {
        return Err(NotAnCustomerReturn);
    }

    // Status check
    let status_changed = check_status_change(&return_row, patch.invoice_row_status_option());
    if status_changed {
        check_invoice_status(
            &return_row,
            patch.invoice_row_status_option(),
            &patch.on_hold,
        )
        .map_err(|e| match e {
            InvoiceRowStatusError::CannotChangeStatusOfInvoiceOnHold => {
                CannotChangeStatusOfInvoiceOnHold
            }
            InvoiceRowStatusError::CannotReverseInvoiceStatus => CannotReverseInvoiceStatus,
        })?;
    }
    // Other party check
    let other_party_id = match &patch.other_party_id {
        None => return Ok((return_row, None, status_changed)),
        Some(other_party_id) => other_party_id,
    };

    let other_party = check_other_party(
        connection,
        store_id,
        other_party_id,
        CheckOtherPartyType::Customer,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OtherPartyNotACustomer,
        OtherPartyErrors::DatabaseError(repository_error) => DatabaseError(repository_error),
    })?;

    Ok((return_row, Some(other_party), status_changed))
}
