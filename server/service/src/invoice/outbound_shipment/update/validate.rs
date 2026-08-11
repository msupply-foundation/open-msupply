use super::{backdated_datetime_change, UpdateOutboundShipment, UpdateOutboundShipmentError};
use crate::common::check_shipping_method_exists;
use crate::invoice::common::check_can_issue_in_foreign_currency;
use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_status, check_invoice_type,
    check_status_change, check_store, custom_fields::check_unknown_custom_fields_key,
    InvoiceRowStatusError,
};
use crate::preference::{preferences::Backdating, Preference};
use crate::validate::{check_other_party_store_is_disabled, get_other_party};
use crate::NullableUpdate;
use chrono::{Duration, Utc};
use repository::{
    EqualFilter, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType, InvoiceRow,
    InvoiceStatus, InvoiceType, StorageConnection,
};

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    patch: &UpdateOutboundShipment,
) -> Result<(InvoiceRow, bool), UpdateOutboundShipmentError> {
    use UpdateOutboundShipmentError::*;

    let invoice = check_invoice_exists(&patch.id, connection)?.ok_or(InvoiceDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(InvoiceIsNotEditable);
    }
    if check_other_party_store_is_disabled(connection, store_id, &invoice.name_id)? {
        return Err(InvoiceIsNotEditable);
    }

    let other_party =
        get_other_party(connection, store_id, &invoice.name_id)?.ok_or(OtherPartyDoesNotExist)?;

    if !check_invoice_type(&invoice, InvoiceType::OutboundShipment) {
        return Err(NotAnOutboundShipment);
    }

    if let Some(properties) = &patch.custom_fields {
        if let Some(unknown) =
            check_unknown_custom_fields_key(connection, &invoice.r#type, properties)?
        {
            return Err(UnknownPropertyKey(unknown));
        }
    }

    if patch.currency_id.is_some()
        && !check_can_issue_in_foreign_currency(connection, store_id)?
        && other_party.store_row.is_some()
    {
        return Err(CannotIssueInForeignCurrency);
    }

    if let Some(NullableUpdate {
        value: Some(shipping_method_id),
    }) = &patch.shipping_method_id
    {
        if !check_shipping_method_exists(connection, shipping_method_id)? {
            return Err(ShippingMethodDoesNotExist);
        }
    }

    // Backdating validation: preference enabled, only New outbound shipments, no lines, not future, max days
    // Only a *change* to the datetime counts - see backdated_datetime_change
    if let Some(backdated_datetime) = backdated_datetime_change(patch.backdated_datetime, &invoice)
    {
        let backdating = Backdating.load(connection, None)?;
        if !backdating.shipments_enabled {
            return Err(CantBackDate(
                "Backdating of shipments is not enabled".to_string(),
            ));
        }

        if invoice.status != InvoiceStatus::New {
            return Err(CantBackDate(
                "Can only backdate new outbound shipments".to_string(),
            ));
        }

        if backdated_datetime > Utc::now() {
            return Err(CantBackDate("Cannot set date in the future".to_string()));
        }

        // Lines are deleted atomically in generate if backdating with existing lines

        if backdating.max_days > 0 {
            let earliest_allowed = Utc::now() - Duration::days(backdating.max_days as i64);
            if backdated_datetime < earliest_allowed {
                return Err(ExceedsMaximumBackdatingDays);
            }
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
        check_can_change_status_to_allocated(connection, &invoice, patch.full_status())?;
        if check_expected_delivery_date_before_shipped_date(patch.full_status(), &invoice) {
            return Err(CannotHaveEstimatedDeliveryDateBeforeShippedDate);
        }
    }
    Ok((invoice, status_changed))
}

// If status is changed to allocated and above, return error if there are
// unallocated lines with quantity above 0, zero quantity unallocated lines will be deleted
fn check_can_change_status_to_allocated(
    connection: &StorageConnection,
    invoice_row: &InvoiceRow,
    status_option: Option<InvoiceStatus>,
) -> Result<(), UpdateOutboundShipmentError> {
    if invoice_row.status != InvoiceStatus::New {
        return Ok(());
    };

    // Status sequence for outbound shipment: New, Allocated, Picked, Shipped
    if let Some(new_status) = status_option {
        if new_status == InvoiceStatus::New {
            return Ok(());
        }

        let repository = InvoiceLineRepository::new(connection);
        let unallocated_lines = repository.query_by_filter(
            InvoiceLineFilter::new()
                .invoice_id(EqualFilter::equal_to(invoice_row.id.to_string()))
                .r#type(InvoiceLineType::UnallocatedStock.equal_to())
                .number_of_packs(EqualFilter::not_equal_to(0.0)),
        )?;

        if !unallocated_lines.is_empty() {
            return Err(
                UpdateOutboundShipmentError::CanOnlyChangeToAllocatedWhenNoUnallocatedLines(
                    unallocated_lines,
                ),
            );
        }
    }

    Ok(())
}

fn check_expected_delivery_date_before_shipped_date(
    status_option: Option<InvoiceStatus>,
    invoice: &InvoiceRow,
) -> bool {
    if status_option != Some(InvoiceStatus::Shipped) {
        return false;
    }

    if let Some(expected_delivery_date) = invoice.expected_delivery_date {
        return expected_delivery_date < Utc::now().date_naive();
    }

    false
}
