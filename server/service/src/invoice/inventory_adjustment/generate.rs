use chrono::Utc;

use repository::{InvoiceLineRow, InvoiceLineRowType, NameRowRepository, StockLine, StockLineRow};
use repository::{
    InvoiceRow, InvoiceRowStatus, InvoiceRowType, NumberRowType, RepositoryError, StorageConnection,
};
use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;
use util::uuid::uuid;

use crate::number::next_number;

use super::{AdjustmentType, InsertInventoryAdjustment};

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    InsertInventoryAdjustment {
        stock_line_id,
        adjustment,
        adjustment_type,
        inventory_adjustment_reason_id,
    }: InsertInventoryAdjustment,
    stock_line: StockLine,
) -> Result<(InvoiceRow, InvoiceLineRow, StockLineRow), RepositoryError> {
    let current_datetime = Utc::now().naive_utc();

    let inventory_adjustment_name = NameRowRepository::new(connection)
        .find_one_by_code(INVENTORY_ADJUSTMENT_NAME_CODE)?
        .ok_or(RepositoryError::NotFound)?;

    let invoice_number = next_number(
        connection,
        &match adjustment_type {
            AdjustmentType::Addition => NumberRowType::InventoryAddition,
            AdjustmentType::Reduction => NumberRowType::InventoryReduction,
        },
        store_id,
    )?;

    let invoice = InvoiceRow {
        id: uuid(),
        user_id: Some(user_id.to_string()),
        name_link_id: inventory_adjustment_name.id,
        r#type: match adjustment_type {
            AdjustmentType::Addition => InvoiceRowType::InventoryAddition,
            AdjustmentType::Reduction => InvoiceRowType::InventoryReduction,
        },
        invoice_number,
        store_id: store_id.to_string(),
        created_datetime: current_datetime,
        status: InvoiceRowStatus::New,
        original_shipment_id: None,
        // Default
        currency_id: None,
        currency_rate: 1.0,
        on_hold: false,
        colour: None,
        comment: None,
        their_reference: None,
        tax_rate: None,
        name_store_id: None,
        transport_reference: None,
        allocated_datetime: None,
        picked_datetime: None,
        shipped_datetime: None,
        delivered_datetime: None,
        verified_datetime: None,
        linked_invoice_id: None,
        requisition_id: None,
        clinician_link_id: None,
    };

    let StockLineRow {
        location_id,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
        ..
    } = stock_line.stock_line_row.clone();

    let invoice_line = InvoiceLineRow {
        id: uuid(),
        invoice_id: invoice.id.clone(),
        item_link_id: stock_line.item_row.id,
        item_name: stock_line.item_row.name,
        item_code: stock_line.item_row.code,
        stock_line_id: Some(stock_line_id),
        location_id,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        total_before_tax: 0.0,
        total_after_tax: 0.0,
        tax_rate: None,
        r#type: match adjustment_type {
            AdjustmentType::Addition => InvoiceLineRowType::StockIn,
            AdjustmentType::Reduction => InvoiceLineRowType::StockOut,
        },
        number_of_packs: adjustment,
        note,
        inventory_adjustment_reason_id,
        return_reason_id: None,
        foreign_currency_price_before_tax: None,
    };

    let mut updated_stock_line = stock_line.stock_line_row;

    let delta = match adjustment_type {
        AdjustmentType::Addition => adjustment,
        AdjustmentType::Reduction => -adjustment,
    };

    updated_stock_line.available_number_of_packs += delta;
    updated_stock_line.total_number_of_packs += delta;

    Ok((invoice, invoice_line, updated_stock_line))
}
