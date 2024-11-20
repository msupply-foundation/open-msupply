use chrono::Utc;

use repository::NameRowRepository;
use repository::{
    InvoiceRow, InvoiceStatus, InvoiceType, NumberRowType, RepositoryError, StorageConnection,
};
use util::constants::INVENTORY_ADJUSTMENT_NAME_CODE;
use util::uuid::uuid;

use crate::invoice::inventory_adjustment::UpdateInventoryAdjustmentReason;
use crate::invoice_line::stock_in_line::{InsertStockInLine, StockInType};
use crate::number::next_number;

use super::AddNewStockLine;

pub struct GenerateResult {
    pub invoice: InvoiceRow,
    pub stock_in_line: InsertStockInLine,
    pub update_inventory_adjustment_reason: UpdateInventoryAdjustmentReason,
}

pub fn generate(
    connection: &StorageConnection,
    store_id: &str,
    user_id: &str,
    AddNewStockLine {
        stock_line_id,
        item_id,
        number_of_packs,
        inventory_adjustment_reason_id,
        cost_price_per_pack,
        sell_price_per_pack,
        pack_size,
        on_hold,
        batch,
        location,
        expiry_date,
        barcode,
        item_variant_id,
    }: AddNewStockLine,
) -> Result<GenerateResult, RepositoryError> {
    let current_datetime = Utc::now().naive_utc();

    let inventory_adjustment_name = NameRowRepository::new(connection)
        .find_one_by_code(INVENTORY_ADJUSTMENT_NAME_CODE)?
        .ok_or(RepositoryError::NotFound)?;

    let invoice_number = next_number(connection, &NumberRowType::InventoryAddition, store_id)?;

    let invoice_id = uuid();

    let invoice = InvoiceRow {
        id: invoice_id.clone(),
        user_id: Some(user_id.to_string()),
        name_link_id: inventory_adjustment_name.id,
        r#type: InvoiceType::InventoryAddition,
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
        backdated_datetime: None,
    };

    let invoice_line_id = uuid();
    let stock_in_line = InsertStockInLine {
        id: invoice_line_id.clone(),
        invoice_id,
        item_id,
        stock_line_id: Some(stock_line_id),
        location,
        pack_size,
        batch,
        cost_price_per_pack,
        sell_price_per_pack,
        expiry_date,
        number_of_packs,
        stock_on_hold: on_hold,
        r#type: StockInType::InventoryAddition,
        note: None,
        total_before_tax: None,
        tax_percentage: None,
        barcode,
        item_variant_id,
    };

    let update_inventory_adjustment_reason = UpdateInventoryAdjustmentReason {
        reason_id: inventory_adjustment_reason_id,
        invoice_line_id,
    };

    Ok(GenerateResult {
        invoice,
        stock_in_line,
        update_inventory_adjustment_reason,
    })
}
