use std::cmp::Ordering;

use repository::{
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, InvoiceLineType,
    Pagination, RepositoryError, StockLine, StockLineFilter, StockLineRepository, StockLineSort,
    StockLineSortField, StorageConnection,
};
use util::{
    constants::stock_line_expiring_soon_offset, date_now, date_now_with_offset,
    fraction_is_integer, uuid,
};

use crate::{
    invoice_line::{
        outbound_shipment_unallocated_line::{
            DeleteOutboundShipmentUnallocatedLine, UpdateOutboundShipmentUnallocatedLine,
        },
        stock_out_line::{InsertStockOutLine, StockOutType, UpdateStockOutLine},
    },
    preference::{ManageVaccinesInDoses, Preference, SortByVvmStatusThenExpiry},
};

use super::AllocateOutboundShipmentUnallocatedLineError;

#[derive(Default)]
pub struct GenerateOutput {
    pub update_lines: Vec<UpdateStockOutLine>,
    pub insert_lines: Vec<InsertStockOutLine>,
    pub update_unallocated_line: Option<UpdateOutboundShipmentUnallocatedLine>,
    pub delete_unallocated_line: Option<DeleteOutboundShipmentUnallocatedLine>,
    pub skipped_expired_stock_lines: Vec<StockLine>,
    pub skipped_on_hold_stock_lines: Vec<StockLine>,
    pub skipped_unusable_vvm_status_lines: Vec<StockLine>,
    pub issued_expiring_soon_stock_lines: Vec<StockLine>,
}

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    unallocated_line: InvoiceLine,
) -> Result<GenerateOutput, AllocateOutboundShipmentUnallocatedLineError> {
    let mut result = GenerateOutput::default();

    let vaccines_in_doses = ManageVaccinesInDoses
        .load(connection, Some(store_id.to_string()))
        .map_err(|e| {
            AllocateOutboundShipmentUnallocatedLineError::PreferenceError(e.to_string())
        })?;
    let sort_by_vvm = SortByVvmStatusThenExpiry
        .load(connection, Some(store_id.to_string()))
        .map_err(|e| {
            AllocateOutboundShipmentUnallocatedLineError::PreferenceError(e.to_string())
        })?;

    let should_allocate_in_doses = vaccines_in_doses && unallocated_line.item_row.is_vaccine;

    let allocated_lines = get_allocated_lines(connection, &unallocated_line)?;
    // Assume pack_size 1 for unallocated line
    let mut remaining_to_allocate = unallocated_line.invoice_line_row.number_of_packs;
    // If nothing remaining to allocate, just remove the line
    if remaining_to_allocate <= 0.0 {
        result.delete_unallocated_line = Some(DeleteOutboundShipmentUnallocatedLine {
            id: unallocated_line.invoice_line_row.id,
        });
        return Ok(result);
    }

    // Asc, by expiry date/vvm status (based on pref), nulls last
    let sorted_available_stock_lines =
        get_sorted_available_stock_lines(connection, store_id, &unallocated_line, sort_by_vvm)?;

    // Use FEFO to allocate
    for stock_line in sorted_available_stock_lines {
        let can_use = get_stock_line_eligibility(&stock_line)
            .map(|eligibility| match eligibility {
                StockLineAlert::OnHold => {
                    result.skipped_on_hold_stock_lines.push(stock_line.clone());
                    false
                }
                StockLineAlert::Expired => {
                    result.skipped_expired_stock_lines.push(stock_line.clone());
                    false
                }
                StockLineAlert::VVMStatusUnusable => {
                    result
                        .skipped_unusable_vvm_status_lines
                        .push(stock_line.clone());
                    false
                }
                StockLineAlert::ExpiringSoon => {
                    result
                        .issued_expiring_soon_stock_lines
                        .push(stock_line.clone());
                    true
                }
            })
            .unwrap_or(true);

        if !can_use {
            continue;
        }

        // When allocating in doses, we assume doses per unit is the default doses per unit for the item
        // Individual stock lines may have different doses per unit, so we need to adjust the allocation accordingly

        // e.g. placeholder remaining is for 8 units, at default of 5 doses per unit = 40 doses
        // this stock line is of variant with 10 doses per unit
        // therefore, should allocate 4 units (x 10 doses per unit = 40 doses)
        let item_variant_doses_per_unit_factor =
            get_item_variant_doses_per_unit_factor(should_allocate_in_doses, &stock_line);

        let packs_to_allocate = packs_to_allocate_from_stock_line(
            remaining_to_allocate * item_variant_doses_per_unit_factor,
            &stock_line,
        );

        // Add to existing allocated line or create new
        match try_allocate_existing_line(
            packs_to_allocate,
            &stock_line.stock_line_row.id,
            &allocated_lines,
        ) {
            Some(stock_line_update) => result.update_lines.push(stock_line_update),
            None => result.insert_lines.push(generate_new_line(
                &unallocated_line.invoice_line_row.invoice_id,
                packs_to_allocate,
                &stock_line,
            )),
        }

        remaining_to_allocate -= stock_line.stock_line_row.pack_size
            * (packs_to_allocate / item_variant_doses_per_unit_factor); // factor should never be 0, should be safe

        if remaining_to_allocate <= 0.0 {
            break;
        }
    }

    // If nothing remaining to alloacted just remove the line, otherwise update
    if remaining_to_allocate <= 0.0 {
        result.delete_unallocated_line = Some(DeleteOutboundShipmentUnallocatedLine {
            id: unallocated_line.invoice_line_row.id,
        });
    } else {
        result.update_unallocated_line = Some(UpdateOutboundShipmentUnallocatedLine {
            id: unallocated_line.invoice_line_row.id,
            quantity: remaining_to_allocate,
        });
    };

    Ok(result)
}

enum StockLineAlert {
    OnHold,
    Expired,
    ExpiringSoon,
    VVMStatusUnusable,
}

fn get_stock_line_eligibility(stock_line: &StockLine) -> Option<StockLineAlert> {
    use StockLineAlert::*;
    let stock_line_row = &stock_line.stock_line_row;
    if stock_line_row.on_hold {
        return Some(OnHold);
    }

    // Expired
    if let Some(expiry_date) = &stock_line_row.expiry_date {
        if let Ordering::Less = expiry_date.cmp(&date_now()) {
            return Some(Expired);
        }

        if let Ordering::Less =
            expiry_date.cmp(&date_now_with_offset(stock_line_expiring_soon_offset()))
        {
            return Some(ExpiringSoon);
        }
    };

    // VVM Unusable
    if let Some(vvm_status) = &stock_line.vvm_status_row {
        if vvm_status.unusable {
            return Some(VVMStatusUnusable);
        }
    };

    None
}

fn generate_new_line(
    invoice_id: &str,
    packs_to_allocate: f64,
    stock_line: &StockLine,
) -> InsertStockOutLine {
    let stock_line_row = &stock_line.stock_line_row;
    InsertStockOutLine {
        id: uuid::uuid(),
        r#type: StockOutType::OutboundShipment,
        invoice_id: invoice_id.to_string(),
        stock_line_id: stock_line_row.id.clone(),
        number_of_packs: packs_to_allocate,
        // Default
        prescribed_quantity: None,
        total_before_tax: None,
        tax_percentage: None,
        note: None,
        location_id: None,
        batch: None,
        pack_size: None,
        expiry_date: None,
        cost_price_per_pack: None,
        sell_price_per_pack: None,
        campaign_id: None,
    }
}

fn try_allocate_existing_line(
    number_of_packs_to_add: f64,
    stock_line_id: &str,
    allocated_lines: &[InvoiceLine],
) -> Option<UpdateStockOutLine> {
    allocated_lines
        .iter()
        .find(|line| line.invoice_line_row.stock_line_id == Some(stock_line_id.to_string()))
        .map(|line| {
            let line_row = line.invoice_line_row.clone();
            UpdateStockOutLine {
                id: line_row.id,
                r#type: Some(StockOutType::OutboundShipment),
                number_of_packs: Some(line_row.number_of_packs + number_of_packs_to_add),
                prescribed_quantity: None,
                stock_line_id: None,
                total_before_tax: None,
                tax: None,
                note: None,
                campaign_id: line_row.campaign_id,
            }
        })
}

fn packs_to_allocate_from_stock_line(remaining_to_allocate: f64, line: &StockLine) -> f64 {
    let available_quantity = line.available_quantity();

    let line_row = &line.stock_line_row;
    if available_quantity < remaining_to_allocate {
        return line_row.available_number_of_packs;
    }
    // We don't want to use fractions for number_of_packs (issue here) - to discuss
    let fractional_number_of_packs = remaining_to_allocate / line_row.pack_size;

    if fraction_is_integer(fractional_number_of_packs) {
        return fractional_number_of_packs;
    }

    fractional_number_of_packs.floor() + 1.0
}

fn get_sorted_available_stock_lines(
    connection: &StorageConnection,
    store_id: &str,
    unallocated_line: &InvoiceLine,
    sort_by_vvm: bool,
) -> Result<Vec<StockLine>, RepositoryError> {
    let filter = StockLineFilter::new()
        .item_id(EqualFilter::equal_to(&unallocated_line.item_row.id))
        .store_id(EqualFilter::equal_to(store_id))
        .is_available(true);

    // Nulls should be last (as per test stock_line_repository_sort)
    let sort = StockLineSort {
        key: match sort_by_vvm {
            true => StockLineSortField::VvmStatusThenExpiry,
            false => StockLineSortField::ExpiryDate,
        },
        desc: Some(false),
    };

    StockLineRepository::new(connection).query(Pagination::new(), Some(filter), Some(sort), None)
}

fn get_allocated_lines(
    connection: &StorageConnection,
    unallocated_line: &InvoiceLine,
) -> Result<Vec<InvoiceLine>, RepositoryError> {
    InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .item_id(EqualFilter::equal_to(&unallocated_line.item_row.id))
            .invoice_id(EqualFilter::equal_to(
                &unallocated_line.invoice_line_row.invoice_id,
            ))
            .r#type(InvoiceLineType::StockOut.equal_to()),
    )
}

fn get_item_variant_doses_per_unit_factor(
    should_allocate_in_doses: bool,
    stock_line: &StockLine,
) -> f64 {
    if !stock_line.item_row.is_vaccine || !should_allocate_in_doses {
        // Should only be working in units, don't need to consider variants
        return 1.0;
    }

    let default_doses_per_unit = f64::from(stock_line.item_row.vaccine_doses);

    let doses_per_unit = stock_line
        .item_variant_row
        .as_ref()
        // If the stock line has an item variant, use its doses per unit
        .map(|variant| f64::from(variant.doses_per_unit))
        // Otherwise use default doses per unit from item
        .unwrap_or(default_doses_per_unit);

    let item_variant_doses_per_unit_factor =
                // f64::max defaults 0.0 to 1.0 (to avoid division by zero)
                f64::max(default_doses_per_unit, 1.0) / f64::max(doses_per_unit, 1.0);

    item_variant_doses_per_unit_factor
}
