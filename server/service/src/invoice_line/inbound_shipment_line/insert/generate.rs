use crate::{
    invoice::common::{generate_invoice_user_id_update, total_after_tax},
    invoice_line::generate_batch,
    u32_to_i32,
};
use repository::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, ItemRow, StockLineRow,
};

use super::InsertInboundShipmentLine;

pub fn generate(
    user_id: &str,
    input: InsertInboundShipmentLine,
    item_row: ItemRow,
    existing_invoice_row: InvoiceRow,
) -> (Option<InvoiceRow>, InvoiceLineRow, Option<StockLineRow>) {
    let mut new_line = generate_line(input, item_row);

    let new_batch_option = if existing_invoice_row.status != InvoiceRowStatus::New {
        let new_batch = generate_batch(&existing_invoice_row.store_id, new_line.clone(), false);
        new_line.stock_line_id = Some(new_batch.id.clone());
        Some(new_batch)
    } else {
        None
    };

    (
        generate_invoice_user_id_update(user_id, existing_invoice_row),
        new_line,
        new_batch_option,
    )
}

fn generate_line(
    InsertInboundShipmentLine {
        id,
        invoice_id,
        item_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        number_of_packs,
        location_id,
        total_before_tax,
        tax,
    }: InsertInboundShipmentLine,
    ItemRow {
        name: item_name,
        code: item_code,
        ..
    }: ItemRow,
) -> InvoiceLineRow {
    InvoiceLineRow {
        id,
        invoice_id,
        item_id,
        location_id,
        pack_size: u32_to_i32(pack_size),
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        r#type: InvoiceLineRowType::StockIn,
        number_of_packs: u32_to_i32(number_of_packs),
        item_name,
        item_code,
        stock_line_id: None,
        total_before_tax: match total_before_tax {
            Some(total_before_tax) => total_before_tax,
            None => cost_price_per_pack * number_of_packs as f64,
        },
        total_after_tax: total_after_tax(
            total_before_tax.unwrap_or(cost_price_per_pack * number_of_packs as f64),
            tax,
        ),
        tax,
        note: None,
    }
}
