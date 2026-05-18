use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_status, check_invoice_type,
    check_status_change, check_store, common::check_can_issue_in_foreign_currency,
    inbound_shipment::UpdateInboundShipmentStatus, InvoiceRowStatusError,
};
use crate::preference::{preferences::Backdating, Preference};
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};
use chrono::{Duration, Utc};
use repository::{
    InvoiceLineRowRepository, InvoiceLineStatus, InvoiceRow, InvoiceStatus, InvoiceType, Name,
    StorageConnection,
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
    if !check_invoice_type(&invoice, InvoiceType::InboundShipment) {
        return Err(NotAnInboundShipment);
    }
    if !r#type.matches_input(invoice.purchase_order_id.is_some()) {
        return Err(WrongInboundShipmentType);
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

        // All pending lines must be resolved (accepted or rejected) before the invoice can be
        // received or verified, otherwise stock would be created for lines that haven't been
        // reviewed yet.
        use UpdateInboundShipmentStatus::*;
        if matches!(patch.status, Some(Received | Verified)) {
            check_no_pending_lines(&invoice.id, connection)?;
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

fn check_no_pending_lines(
    invoice_id: &str,
    connection: &StorageConnection,
) -> Result<(), UpdateInboundShipmentError> {
    let invoice_lines =
        InvoiceLineRowRepository::new(connection).find_many_by_invoice_id(invoice_id)?;

    for invoice_line in invoice_lines {
        if invoice_line.status == Some(InvoiceLineStatus::Pending) {
            return Err(UpdateInboundShipmentError::CannotReceiveWithPendingLines);
        }
    }

    Ok(())
}
