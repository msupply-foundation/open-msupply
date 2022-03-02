use repository::schema::{InvoiceLineRow, InvoiceLineRowType, ItemRow};
use util::inline_init;

use super::{InsertOutboundShipmentServiceLine, InsertOutboundShipmentServiceLineError};

pub fn generate(
    input: InsertOutboundShipmentServiceLine,
    item: ItemRow,
) -> Result<InvoiceLineRow, InsertOutboundShipmentServiceLineError> {
    let new_line = inline_init(|r: &mut InvoiceLineRow| {
        r.id = input.id;
        r.invoice_id = input.invoice_id;
        r.item_id = item.id;
        r.item_code = item.code;
        r.item_name = input.name.unwrap_or(item.name);
        r.total_before_tax = input.total_before_tax;
        r.total_after_tax = input.total_after_tax;
        r.tax = input.tax;
        r.note = input.note;
        r.r#type = InvoiceLineRowType::Service;
    });

    Ok(new_line)
}
