use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_status, check_invoice_type,
    check_status_change, check_store, common::check_can_issue_in_foreign_currency,
    inbound_shipment::{UpdateInboundShipmentStatus, check_inbound_shipment_mutation_permission}, InvoiceRowStatusError,
};
use crate::validate::{check_other_party, CheckOtherPartyType, OtherPartyErrors};
use chrono::{NaiveDateTime, Utc};
use repository::{
    InvoiceLineRowRepository, InvoiceLineStatus, InvoiceRow, InvoiceType, Name, StorageConnection,
};

use super::{UpdateInboundShipment, UpdateInboundShipmentError};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
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
    if !check_invoice_type(&invoice, InvoiceType::InboundShipment) {
        return Err(NotAnInboundShipment);
    }

    // Check if user has permission for this shipment type (internal or external)
    let is_external = invoice.purchase_order_id.is_some();
    check_inbound_shipment_mutation_permission(connection, store_id, user_id, is_external)?;

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

        // All pending lines must be resolved (accepted or rejected) before the invoice can be
        // received or verified, otherwise stock would be created for lines that haven't been
        // reviewed yet.
        use UpdateInboundShipmentStatus::*;
        if matches!(patch.status, Some(Received | Verified)) {
            check_no_pending_lines(&invoice.id, connection)?;
        }
    }

    // Delivered datetime is only editable for external inbound shipments (those created from a
    // purchase order). It must not be in the future and must not be after the received datetime,
    // as the goods can't have been delivered after they were received.
    if let Some(delivered_datetime) = patch.delivered_datetime {
        if invoice.purchase_order_id.is_none() {
            return Err(CanOnlyChangeDateOfExternalInboundShipments);
        }

        let delivered_datetime = NaiveDateTime::from(delivered_datetime);
        if delivered_datetime > Utc::now().naive_utc() {
            return Err(CannotSetDeliveredDateInFuture);
        }

        if let Some(received_datetime) = invoice.received_datetime {
            if delivered_datetime > received_datetime {
                return Err(CannotPutDeliveredDateAfterReceivedDate);
            }
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
