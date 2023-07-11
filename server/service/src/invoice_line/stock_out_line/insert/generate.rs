use repository::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, ItemRow, StockLineRow,
};

use crate::invoice::common::calculate_total_after_tax;

use super::{InsertOutInvoiceLine, InsertOutInvoiceLineError};

pub fn generate(
    input: InsertOutInvoiceLine,
    item_row: ItemRow,
    batch: StockLineRow,
    invoice: InvoiceRow,
) -> Result<(InvoiceLineRow, StockLineRow), InsertOutInvoiceLineError> {
    let adjust_total_number_of_packs = invoice.status == InvoiceRowStatus::Picked;

    let update_batch = generate_batch_update(&input, batch.clone(), adjust_total_number_of_packs);
    let new_line = generate_line(input, item_row, batch, invoice);

    Ok((new_line, update_batch))
}

fn generate_batch_update(
    input: &InsertOutInvoiceLine,
    batch: StockLineRow,
    adjust_total_number_of_packs: bool,
) -> StockLineRow {
    let mut update_batch = batch;

    let reduction = input.number_of_packs;

    update_batch.available_number_of_packs = update_batch.available_number_of_packs - reduction;
    if adjust_total_number_of_packs {
        update_batch.total_number_of_packs = update_batch.total_number_of_packs - reduction;
    }

    update_batch
}

fn generate_line(
    InsertOutInvoiceLine {
        id,
        invoice_id,
        item_id,
        stock_line_id,
        number_of_packs,
        total_before_tax,
        tax: _,
        note,
    }: InsertOutInvoiceLine,
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
        note: _,
        ..
    }: StockLineRow,
    InvoiceRow { tax, .. }: InvoiceRow,
) -> InvoiceLineRow {
    let total_before_tax = total_before_tax.unwrap_or(cost_price_per_pack * number_of_packs as f64);
    let total_after_tax = calculate_total_after_tax(total_before_tax, tax);

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
        number_of_packs,
        item_name,
        item_code,
        stock_line_id: Some(stock_line_id),
        total_before_tax,
        total_after_tax,
        tax,
        note,
        inventory_adjustment_reason_id: None,
    }
}
