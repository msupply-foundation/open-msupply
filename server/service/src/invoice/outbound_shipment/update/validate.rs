use super::{UpdateOutboundShipment, UpdateOutboundShipmentError};
use crate::invoice::common::check_can_issue_in_foreign_currency;
use crate::invoice::{
    check_invoice_exists, check_invoice_is_editable, check_invoice_status, check_invoice_type,
    check_status_change, check_store, InvoiceRowStatusError,
};
use crate::store_preference::get_store_preferences;
use crate::validate::get_other_party;
use chrono::Utc;
use repository::{
    EqualFilter, NameLinkRowRepository, RequisitionLineFilter, RequisitionLineRepository,
};
use repository::{
    InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType, InvoiceRow, InvoiceStatus,
    InvoiceType, StorageConnection,
};
use std::collections::HashMap;

pub fn validate(
    connection: &StorageConnection,
    store_id: &str,
    patch: &UpdateOutboundShipment,
) -> Result<(InvoiceRow, bool), UpdateOutboundShipmentError> {
    use UpdateOutboundShipmentError::*;
    let store_preferences = get_store_preferences(connection, store_id)?;

    let invoice = check_invoice_exists(&patch.id, connection)?.ok_or(InvoiceDoesNotExist)?;
    let other_party_id = NameLinkRowRepository::new(connection)
        .find_one_by_id(&invoice.name_link_id)?
        .ok_or(OtherPartyDoesNotExist)?
        .name_id;
    let other_party =
        get_other_party(connection, store_id, &other_party_id)?.ok_or(OtherPartyDoesNotExist)?;

    if !check_store(&invoice, store_id) {
        return Err(NotThisStoreInvoice);
    }
    if !check_invoice_is_editable(&invoice) {
        return Err(InvoiceIsNotEditable);
    }
    if !check_invoice_type(&invoice, InvoiceType::OutboundShipment) {
        return Err(NotAnOutboundShipment);
    }
    if patch.currency_id.is_some()
        && !check_can_issue_in_foreign_currency(connection, store_id)?
        && other_party.store_row.is_some()
    {
        return Err(CannotIssueInForeignCurrency);
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

        // Don't allow users to issue more than what has been authorised in the
        // linked requisition
        if store_preferences.response_requisition_requires_authorisation {
            validate_approved_quantities(connection, &invoice)?
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
                .invoice_id(EqualFilter::equal_to(&invoice_row.id))
                .r#type(InvoiceLineType::UnallocatedStock.equal_to())
                .number_of_packs(EqualFilter::not_equal_to_f64(0.0)),
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

fn validate_approved_quantities(
    connection: &StorageConnection,
    invoice: &InvoiceRow,
) -> Result<(), UpdateOutboundShipmentError> {
    let Some(ref requisition_id) = invoice.requisition_id else {
        return Ok(());
    };

    let invoice_lines = InvoiceLineRepository::new(connection)
        .query_by_filter(InvoiceLineFilter::new().invoice_id(EqualFilter::equal_to(&invoice.id)))?;

    let item_ids: Vec<String> = invoice_lines
        .iter()
        .map(|line| line.invoice_line_row.item_link_id.clone())
        .collect();

    let requisition_lines = RequisitionLineRepository::new(connection).query_by_filter(
        RequisitionLineFilter::new()
            .requisition_id(EqualFilter::equal_to(requisition_id))
            .item_id(EqualFilter::equal_any(item_ids)),
    )?;

    let requisition = requisition_lines[0].requisition_row.clone();
    if requisition.program_id.is_none() {
        return Ok(());
    }

    let approved_quantities: HashMap<String, f64> = requisition_lines
        .into_iter()
        .map(|req_line| {
            (
                req_line.requisition_line_row.item_link_id,
                req_line.requisition_line_row.approved_quantity,
            )
        })
        .collect();

    let mut item_quantities: HashMap<String, f64> = HashMap::new();
    let mut invalid_lines = Vec::new();

    for invoice_line in invoice_lines {
        let line_row = &invoice_line.invoice_line_row;
        let item_id = &line_row.item_link_id;
        let line_quantity = line_row.number_of_packs * line_row.pack_size;

        let total_quantity = item_quantities.entry(item_id.clone()).or_insert(0.0);
        *total_quantity += line_quantity;

        if let Some(&approved_quantity) = approved_quantities.get(item_id) {
            if *total_quantity > approved_quantity {
                invalid_lines.push(invoice_line.clone());
            }
        }
    }

    if !invalid_lines.is_empty() {
        return Err(UpdateOutboundShipmentError::CannotIssueMoreThanAuthorised(
            invalid_lines,
        ));
    }
    Ok(())
}
