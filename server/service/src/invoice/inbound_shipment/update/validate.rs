use crate::invoice::common::check_can_issue_in_foreign_currency;
use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_status, check_invoice_type,
    check_status_change, check_store, InvoiceRowStatusError,
};
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};
use repository::{InvoiceRow, InvoiceRowType, Name, StorageConnection};

use super::{UpdateInboundShipment, UpdateInboundShipmentError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    patch: &UpdateInboundShipment,
) -> Result<(InvoiceRow, Option<Name>, bool), UpdateInboundShipmentError> {
    use UpdateInboundShipmentError::*;

    let invoice = check_invoice_exists(&patch.id, connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if !check_invoice_type(&invoice, InvoiceRowType::InboundShipment) {
        return Err(NotAnInboundShipment);
    }

    // Status check
    let status_changed = check_status_change(&invoice, patch.full_status());
    if status_changed {
        check_invoice_status(&invoice, patch.full_status(), &patch.on_hold).map_err(
            |e| match e {
                InvoiceRowStatusError::CannotChangeStatusOfInvoiceOnHold => {
                    CannotChangeStatusOfInvoiceOnHold
                }
                InvoiceRowStatusError::CannotReverseInvoiceStatus => CannotReverseInvoiceStatus,
            },
        )?;
    }

    // Other party check
    let other_party_id = match &patch.other_party_id {
        None => return Ok((invoice, None, status_changed)),
        Some(other_party_id) => other_party_id,
    };

    let other_party = check_other_party(
        connection,
        store_id,
        other_party_id,
        CheckOtherPartyType::Supplier,
    )
    .map_err(|e| match e {
        OtherPartyErrors::OtherPartyDoesNotExist => OtherPartyDoesNotExist {},
        OtherPartyErrors::OtherPartyNotVisible => OtherPartyNotVisible,
        OtherPartyErrors::TypeMismatched => OtherPartyNotASupplier,
        OtherPartyErrors::DatabaseError(repository_error) => DatabaseError(repository_error),
    })?;

    if patch.currency_id.is_some()
        && other_party.store_row.is_some()
        && !check_can_issue_in_foreign_currency(connection, store_id)?
    {
        return Err(CannotIssueForeignCurrencyForInternalSuppliers);
    }

    Ok((invoice, Some(other_party), status_changed))
}
