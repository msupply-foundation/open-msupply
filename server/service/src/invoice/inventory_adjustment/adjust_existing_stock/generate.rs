use chrono::Utc;

use repository::{
    InvoiceRow, InvoiceStatus, InvoiceType, NumberRowType, RepositoryError, StorageConnection,
};
use repository::{NameRowRepository, StockLine, StockLineRow};
use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;
use util::uuid::uuid;

use crate::invoice::inventory_adjustment::UpdateInventoryAdjustmentReason;
use crate::invoice_line::stock_in_line::{InsertStockInLine, StockInType};
use crate::invoice_line::stock_out_line::{InsertStockOutLine, StockOutType};
use crate::number::next_number;
use crate::{i32_to_u32, NullableUpdate};

use super::{AdjustmentType, InsertInventoryAdjustment};

pub enum InsertStockInOrOutLine {
    StockIn(InsertStockInLine),
    StockOut(InsertStockOutLine),
}

pub struct GenerateResult {
    pub invoice: InvoiceRow,
    pub insert_stock_in_or_out_line: InsertStockInOrOutLine,
    pub update_inventory_adjustment_reason: UpdateInventoryAdjustmentReason,
}

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
) -> Result<GenerateResult, RepositoryError> {
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
            AdjustmentType::Addition => InvoiceType::InventoryAddition,
            AdjustmentType::Reduction => InvoiceType::InventoryReduction,
        },
        invoice_number,
        store_id: store_id.to_string(),
        created_datetime: current_datetime,
        status: InvoiceStatus::New,
        original_shipment_id: None,
        // Default
        currency_id: None,
        currency_rate: 1.0,
        on_hold: false,
        colour: None,
        comment: None,
        their_reference: None,
        tax_percentage: None,
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
        on_hold,
        ..
    } = stock_line.stock_line_row.clone();

    let invoice_id = invoice.id.clone();
    let invoice_line_id = uuid();

    let insert_stock_in_or_out_line = match adjustment_type {
        AdjustmentType::Addition => InsertStockInOrOutLine::StockIn(InsertStockInLine {
            r#type: StockInType::InventoryAddition,
            id: invoice_line_id.clone(),
            invoice_id,
            stock_line_id: Some(stock_line_id),
            number_of_packs: adjustment,
            // From existing stock line
            item_id: stock_line.item_row.id,
            location: location_id.map(|id| NullableUpdate { value: Some(id) }),
            pack_size: i32_to_u32(pack_size),
            batch,
            cost_price_per_pack,
            sell_price_per_pack,
            expiry_date,
            stock_on_hold: on_hold,
            // TODO: `note` currently gets applied to both stock line and invoice line.
            // We pass it through here so completing an inventory adjustment will not
            // clear any stock line note, but this means any existing stock line note will
            // be applied to the inventory adjustment invoice line.
            // If we want a different note invoice line, StockIn needs another field
            note,
            // Default
            barcode: None,
            total_before_tax: None,
            tax_percentage: None,
        }),
        AdjustmentType::Reduction => InsertStockInOrOutLine::StockOut(InsertStockOutLine {
            r#type: StockOutType::InventoryReduction,
            id: invoice_line_id.clone(),
            invoice_id,
            stock_line_id,
            note,
            number_of_packs: adjustment,
            total_before_tax: None,
            tax_percentage: None,
        }),
    };

    let update_inventory_adjustment_reason = UpdateInventoryAdjustmentReason {
        reason_id: inventory_adjustment_reason_id,
        invoice_line_id,
    };

    Ok(GenerateResult {
        invoice,
        insert_stock_in_or_out_line,
        update_inventory_adjustment_reason,
    })
}
