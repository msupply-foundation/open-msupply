use repository::schema::{InvoiceLineRow, ItemRow};

use super::{InsertOutboundShipmentServiceLine, InsertOutboundShipmentServiceLineError};

pub fn generate(
    input: InsertOutboundShipmentServiceLine,
    item: ItemRow,
) -> Result<InvoiceLineRow, InsertOutboundShipmentServiceLineError> {
    let new_line = InvoiceLineRow {
        id: input.id,
        invoice_id: input.invoice_id,
        item_id: input.item_id,
        item_code: item.code,
        item_name: input.name.unwrap_or(item.name),
        total_before_tax: input.total_before_tax,
        total_after_tax: input.total_after_tax,
        tax: input.tax,
        note: input.note,

        // unrelated to a service item:
        location_id: None,
        pack_size: 0,
        batch: None,
        expiry_date: None,
        sell_price_per_pack: 0.0,
        cost_price_per_pack: 0.0,
        number_of_packs: 0,
        stock_line_id: None,
    };

    Ok(new_line)
}
