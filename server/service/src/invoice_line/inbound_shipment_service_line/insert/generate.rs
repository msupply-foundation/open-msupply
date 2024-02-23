use repository::{InvoiceLineRow, InvoiceLineRowType, ItemRow};

use crate::invoice::common::calculate_total_after_tax;

use super::{InsertInboundShipmentServiceLine, InsertInboundShipmentServiceLineError};

pub fn generate(
    InsertInboundShipmentServiceLine {
        id,
        invoice_id,
        item_id: _,
        name,
        total_before_tax,
        tax,
        note,
    }: InsertInboundShipmentServiceLine,
    item: ItemRow,
) -> Result<InvoiceLineRow, InsertInboundShipmentServiceLineError> {
    Ok(InvoiceLineRow {
        id,
        invoice_id,
        total_before_tax,
        total_after_tax: calculate_total_after_tax(total_before_tax, tax),
        tax,
        note,
        item_code: item.code,
        item_link_id: item.id,
        item_name: name.unwrap_or(item.name),
        r#type: InvoiceLineRowType::Service,
        // Default
        stock_line_id: None,
        location_id: None,
        batch: None,
        expiry_date: None,
        pack_size: 0,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        number_of_packs: 0.0,
        inventory_adjustment_reason_id: None,
        return_reason_id: None,
    })
}
