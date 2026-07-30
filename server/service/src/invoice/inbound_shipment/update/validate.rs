use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_status, check_invoice_type,
    check_status_change, check_store, common::check_can_issue_in_foreign_currency,
    inbound_shipment::UpdateInboundShipmentStatus, custom_fields::check_unknown_custom_fields_key,
    InvoiceRowStatusError,
};
use crate::preference::{preferences::Backdating, Preference};
use crate::validate::{
    check_other_party, check_other_party_store_is_disabled, CheckOtherPartyType, OtherPartyErrors,
};
use chrono::{Duration, Utc};
use repository::{
    InvoiceLineRow, InvoiceLineRowRepository, InvoiceLineStatus, InvoiceLineType, InvoiceRow,
    InvoiceStatus, InvoiceType, Name, StorageConnection,
};

use super::{super::InboundShipmentType, UpdateInboundShipment, UpdateInboundShipmentError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    patch: &UpdateInboundShipment,
    r#type: InboundShipmentType,
) -> Result<(InvoiceRow, Option<Name>, bool), UpdateInboundShipmentError> {
    use UpdateInboundShipmentError::*;

    let invoice = check_invoice_exists(&patch.id, connection)?.ok_or(InvoiceDoesNotExist)?;
    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }

    if !check_invoice_is_editable(&invoice) {
        return Err(CannotEditFinalised);
    }
    if check_other_party_store_is_disabled(connection, store_id, &invoice.name_id)? {
        return Err(OtherPartyStoreDisabled);
    }
    if !check_invoice_type(&invoice, InvoiceType::InboundShipment) {
        return Err(NotAnInboundShipment);
    }
    if !r#type.matches_input(invoice.purchase_order_id.is_some()) {
        return Err(WrongInboundShipmentType);
    }

    if let Some(properties) = &patch.custom_fields {
        if let Some(unknown) =
            check_unknown_custom_fields_key(connection, &invoice.r#type, properties)?
        {
            return Err(UnknownPropertyKey(unknown));
        }
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

        // Shipped isn't valid for manual inbound shipments
        if matches!(patch.status, Some(Shipped))
            && invoice.purchase_order_id.is_none()
            && invoice.linked_invoice_id.is_none()
        {
            return Err(CannotSetShippedStatusOnManualInboundShipment);
        }

        use UpdateInboundShipmentStatus::*;
        if matches!(patch.status, Some(Received | Verified)) {
            check_lines_can_be_received(&invoice.id, connection)?;
        }
    }

    // Received datetime can only be backdated (moved earlier) on shipments that are already
    // in Received or Verified status. Once moved back it cannot be moved forward again.
    if let Some(received_datetime) = patch.received_datetime {
        let backdating = Backdating.load(connection, None)?;
        if !backdating.shipments_enabled {
            return Err(BackdatingNotEnabled);
        }

        // Must already be received
        if !matches!(
            invoice.status,
            InvoiceStatus::Received | InvoiceStatus::Verified
        ) {
            return Err(CanOnlyBackdateReceivedShipments);
        }

        // Can only move the date earlier, never forward
        if let Some(current_received) = invoice.received_datetime {
            if received_datetime.naive_utc() >= current_received {
                return Err(CannotMoveReceivedDateForward);
            }
        }

        // Check maximum backdating days preference
        if backdating.max_days > 0 {
            let earliest_allowed = Utc::now() - Duration::days(backdating.max_days as i64);
            if received_datetime < earliest_allowed {
                return Err(ExceedsMaximumBackdatingDays);
            }
        }
    }

    // Currency rate must be positive if provided
    if let Some(rate) = patch.currency_rate {
        if rate <= 0.0 {
            return Err(CurrencyRateMustBePositive);
        }
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

    // Don't put validation here, there is an early return above

    Ok((invoice, Some(other_party), status_changed))
}

/// Checks that the lines of an invoice are in a fit state to be received or verified:
///
/// * All pending lines must be resolved (accepted or rejected), otherwise stock would be created
///   for lines that haven't been reviewed yet.
/// * The invoice must not be empty. An invoice with no lines at all, or one whose only lines are
///   placeholders (nothing received and nothing shipped), receives no stock, so confirming it
///   would produce a finalised but empty shipment.
fn check_lines_can_be_received(
    invoice_id: &str,
    connection: &StorageConnection,
) -> Result<(), UpdateInboundShipmentError> {
    let invoice_lines =
        InvoiceLineRowRepository::new(connection).find_many_by_invoice_id(invoice_id)?;

    for invoice_line in &invoice_lines {
        if invoice_line.status == Some(InvoiceLineStatus::Pending) {
            return Err(UpdateInboundShipmentError::CannotReceiveWithPendingLines);
        }
    }

    if invoice_lines.iter().all(is_placeholder_line) {
        return Err(UpdateInboundShipmentError::CannotReceiveWithNoLines);
    }

    Ok(())
}

/// A stock in line with nothing received and nothing shipped. It's valid to record "the supplier
/// said they sent 5 packs but I received 0", which is why shipped packs are checked too. These
/// are the same lines that `empty_lines_to_trim` deletes when the invoice leaves New status.
///
/// Mirrors `validateEmptyInvoice` on the client. Note service lines (freight charges and the
/// like) are not placeholders, so an invoice of only service lines can still be received.
fn is_placeholder_line(line: &InvoiceLineRow) -> bool {
    line.r#type == InvoiceLineType::StockIn
        && line.number_of_packs == 0.0
        && line.shipped_number_of_packs.unwrap_or(0.0) == 0.0
}
