use crate::{invoice::common::total_after_tax, u32_to_i32};
use repository::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, ItemRow, StockLineRow,
};

use super::{InsertOutboundShipmentLine, InsertOutboundShipmentLineError};

pub fn generate(
    input: InsertOutboundShipmentLine,
    item_row: ItemRow,
    batch: StockLineRow,
    invoice: InvoiceRow,
) -> Result<(InvoiceLineRow, StockLineRow), InsertOutboundShipmentLineError> {
    let adjust_total_number_of_packs = invoice.status == InvoiceRowStatus::Picked;

    let update_batch = generate_batch_update(&input, batch.clone(), adjust_total_number_of_packs);
    let new_line = generate_line(input, item_row, batch);

    Ok((new_line, update_batch))
}

fn generate_batch_update(
    input: &InsertOutboundShipmentLine,
    batch: StockLineRow,
    adjust_total_number_of_packs: bool,
) -> StockLineRow {
    let mut update_batch = batch;

    let reduction = u32_to_i32(input.number_of_packs);

    update_batch.available_number_of_packs = update_batch.available_number_of_packs - reduction;
    if adjust_total_number_of_packs {
        update_batch.total_number_of_packs = update_batch.total_number_of_packs - reduction;
    }

    update_batch
}

fn generate_line(
    InsertOutboundShipmentLine {
        id,
        invoice_id,
        item_id,
        stock_line_id,
        number_of_packs,
        total_before_tax,
        tax,
    }: InsertOutboundShipmentLine,
    ItemRow {
        name: item_name,
        code: item_code,
        ..
    }: ItemRow,
    StockLineRow {
        sell_price_per_pack,
        cost_price_per_pack,
        pack_size,
        batch,
        expiry_date,
        location_id,
        note,
        ..
    }: StockLineRow,
) -> InvoiceLineRow {
    InvoiceLineRow {
        id,
        invoice_id,
        item_id,
        location_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        r#type: InvoiceLineRowType::StockOut,
        number_of_packs: u32_to_i32(number_of_packs),
        item_name,
        item_code,
        stock_line_id: Some(stock_line_id),
        total_before_tax: match total_before_tax {
            Some(total_before_tax) => total_before_tax,
            None => cost_price_per_pack * number_of_packs as f64,
        },
        total_after_tax: total_after_tax(
            total_before_tax.unwrap_or(cost_price_per_pack * number_of_packs as f64),
            tax,
        ),
        tax,
        note,
    }
}
