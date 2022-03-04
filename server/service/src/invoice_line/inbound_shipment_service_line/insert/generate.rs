use repository::schema::{InvoiceLineRow, InvoiceLineRowType, ItemRow};
use util::inline_init;

use super::{InsertInboundShipmentServiceLine, InsertInboundShipmentServiceLineError};

pub fn generate(
    InsertInboundShipmentServiceLine {
        id,
        invoice_id,
        item_id: _,
        name,
        total_before_tax,
        total_after_tax,
        tax,
        note,
    }: InsertInboundShipmentServiceLine,
    item: ItemRow,
) -> Result<InvoiceLineRow, InsertInboundShipmentServiceLineError> {
    let new_line = inline_init(|r: &mut InvoiceLineRow| {
        r.id = id;
        r.invoice_id = invoice_id;
        r.item_id = item.id;
        r.item_code = item.code;
        r.item_name = name.unwrap_or(item.name);
        r.total_before_tax = total_before_tax;
        r.total_after_tax = total_after_tax;
        r.tax = tax;
        r.note = note;
        r.r#type = InvoiceLineRowType::Service;
    });

    Ok(new_line)
}
