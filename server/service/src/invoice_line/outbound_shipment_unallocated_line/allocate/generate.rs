use std::cmp::Ordering;

use repository::{
    db_diesel::{InvoiceLineRow, InvoiceLineRowType},
    EqualFilter, InvoiceLine, InvoiceLineFilter, InvoiceLineRepository, Pagination,
    RepositoryError, StockLine, StockLineFilter, StockLineRepository, StockLineSort,
    StockLineSortField, StorageConnection,
};
use util::{
    constants::stock_line_expiring_soon_offset, date_now, date_now_with_offset,
    fraction_is_integer, uuid,
};

use crate::invoice_line::{
    outbound_shipment_line::{InsertOutboundShipmentLine, UpdateOutboundShipmentLine},
    outbound_shipment_unallocated_line::{
        DeleteOutboundShipmentUnallocatedLine, UpdateOutboundShipmentUnallocatedLine,
    },
};

#[derive(Default)]
pub struct GenerateOutput {
    pub update_lines: Vec<UpdateOutboundShipmentLine>,
    pub insert_lines: Vec<InsertOutboundShipmentLine>,
    pub update_unallocated_line: Option<UpdateOutboundShipmentUnallocatedLine>,
    pub delete_unallocated_line: Option<DeleteOutboundShipmentUnallocatedLine>,
    pub skipped_expired_stock_lines: Vec<StockLine>,
    pub skipped_on_hold_stock_lines: Vec<StockLine>,
    pub issued_expiring_soon_stock_lines: Vec<StockLine>,
}

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    unallocated_line: InvoiceLineRow,
) -> Result<GenerateOutput, RepositoryError> {
    let mut result = GenerateOutput::default();
    let allocated_lines = get_allocated_lines(connection, &unallocated_line)?;
    // Assume pack_size 1 for unallocated line
    let mut remaining_to_allocated = unallocated_line.number_of_packs;
    // If nothing remaing to alloacted just remove the line
    if remaining_to_allocated <= 0 {
        result.delete_unallocated_line = Some(DeleteOutboundShipmentUnallocatedLine {
            id: unallocated_line.id,
        });
        return Ok(result);
    }
    // Asc, by expiry date, nulls last
    let sorted_available_stock_lines =
        get_sorted_available_stock_lines(connection, store_id, &unallocated_line)?;
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

        let packs_to_allocate =
            packs_to_allocate_from_stock_line(remaining_to_allocated, &stock_line);

        // Add to existing allocated line or create new
        match try_allocate_existing_line(
            packs_to_allocate,
            &stock_line.stock_line_row.id,
            &allocated_lines,
        ) {
            Some(stock_line_update) => result.update_lines.push(stock_line_update),
            None => result.insert_lines.push(generate_new_line(
                &unallocated_line.invoice_id,
                packs_to_allocate,
                &stock_line,
            )),
        }

        remaining_to_allocated =
            remaining_to_allocated - packs_to_allocate * stock_line.stock_line_row.pack_size;

        if remaining_to_allocated <= 0 {
            break;
        }
    }

    // If nothing remaing to alloacted just remove the line, otherwise update
    if remaining_to_allocated <= 0 {
        result.delete_unallocated_line = Some(DeleteOutboundShipmentUnallocatedLine {
            id: unallocated_line.id,
        });
    } else {
        result.update_unallocated_line = Some(UpdateOutboundShipmentUnallocatedLine {
            id: unallocated_line.id,
            quantity: remaining_to_allocated as u32,
        });
    };

    Ok(result)
}

enum StockLineAlert {
    OnHold,
    Expired,
    ExpiringSoon,
}

fn get_stock_line_eligibility(stock_line: &StockLine) -> Option<StockLineAlert> {
    use StockLineAlert::*;
    let stock_line_row = &stock_line.stock_line_row;
    // Expired
    if stock_line_row.on_hold {
        return Some(OnHold);
    }

    let expiry_date = match &stock_line_row.expiry_date {
        Some(expiry_date) => expiry_date,
        None => return None,
    };

    if let Ordering::Less = expiry_date.cmp(&date_now()) {
        return Some(Expired);
    }

    if let Ordering::Less =
        expiry_date.cmp(&date_now_with_offset(stock_line_expiring_soon_offset()))
    {
        return Some(ExpiringSoon);
    }

    None
}

fn generate_new_line(
    invoice_id: &str,
    packs_to_allocate: i32,
    stock_line: &StockLine,
) -> InsertOutboundShipmentLine {
    let stock_line_row = &stock_line.stock_line_row;
    InsertOutboundShipmentLine {
        id: uuid::uuid(),
        invoice_id: invoice_id.to_string(),
        item_id: stock_line_row.item_id.clone(),
        stock_line_id: stock_line_row.id.clone(),
        number_of_packs: packs_to_allocate as u32,
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        tax: None,
    }
}

fn try_allocate_existing_line(
    number_of_packs_to_add: i32,
    stock_line_id: &str,
    allocated_lines: &Vec<InvoiceLine>,
) -> Option<UpdateOutboundShipmentLine> {
    allocated_lines
        .iter()
        .find(|line| line.invoice_line_row.stock_line_id == Some(stock_line_id.to_string()))
        .map(|line| {
            let line_row = line.invoice_line_row.clone();
            UpdateOutboundShipmentLine {
                id: line_row.id,
                invoice_id: line_row.invoice_id,
                number_of_packs: Some((line_row.number_of_packs + number_of_packs_to_add) as u32),
                item_id: None,
                stock_line_id: None,
                total_before_tax: None,
                total_after_tax: None,
                tax: None,
            }
        })
}

fn packs_to_allocate_from_stock_line(remaining_to_allocated: i32, line: &StockLine) -> i32 {
    let available_quantity = line.available_quantity();
    let line_row = &line.stock_line_row;
    if available_quantity < remaining_to_allocated {
        return line_row.available_number_of_packs;
    }
    // We don't want to use fractions for number_of_packs (issue here)
    let fractional_number_of_packs = remaining_to_allocated as f64 / line_row.pack_size as f64;

    if fraction_is_integer(fractional_number_of_packs) {
        return fractional_number_of_packs as i32;
    }

    fractional_number_of_packs.floor() as i32 + 1
}

fn get_sorted_available_stock_lines(
    connection: &StorageConnection,
    store_id: &str,
    unallocated_line: &InvoiceLineRow,
) -> Result<Vec<StockLine>, RepositoryError> {
    let filter = StockLineFilter::new()
        .item_id(EqualFilter::equal_to(&unallocated_line.item_id))
        .store_id(EqualFilter::equal_to(store_id))
        .is_available(true);

    // Nulls should be last (as per test stock_line_repository_sort)
    let sort = StockLineSort {
        key: StockLineSortField::ExpiryDate,
        desc: Some(false),
    };

    StockLineRepository::new(connection).query(Pagination::new(), Some(filter), Some(sort))
}

fn get_allocated_lines(
    connection: &StorageConnection,
    unallocated_line: &InvoiceLineRow,
) -> Result<Vec<InvoiceLine>, RepositoryError> {
    InvoiceLineRepository::new(connection).query_by_filter(
        InvoiceLineFilter::new()
            .item_id(EqualFilter::equal_to(&unallocated_line.item_id))
            .invoice_id(EqualFilter::equal_to(&unallocated_line.invoice_id))
            .r#type(InvoiceLineRowType::StockOut.equal_to()),
    )
}
