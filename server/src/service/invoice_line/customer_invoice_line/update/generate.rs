use crate::{
    database::schema::{InvoiceLineRow, InvoiceRow, ItemRow, StockLineRow},
    domain::customer_invoice::UpdateCustomerInvoiceLine,
    service::u32_to_i32,
};

use super::UpdateCustomerInvoiceLineError;

pub fn generate(
    input: UpdateCustomerInvoiceLine,
    existing_line: InvoiceLineRow,
    item_row: ItemRow,
    batch: StockLineRow,
    _: InvoiceRow,
) -> Result<InvoiceLineRow, UpdateCustomerInvoiceLineError> {
    let new_line = generate_line(input, existing_line, item_row, batch);

    // Adjust stock line

    Ok(new_line)
}

fn generate_line(
    input: UpdateCustomerInvoiceLine,
    InvoiceLineRow {
        id,
        invoice_id,
        number_of_packs,
        total_after_tax,
        ..
    }: InvoiceLineRow,
    ItemRow {
        id: item_id,
        name: item_name,
        code: item_code,
        ..
    }: ItemRow,
    StockLineRow {
        id: stock_line_id,
        sell_price_per_pack,
        cost_price_per_pack,
        pack_size,
        batch,
        expiry_date,
        ..
    }: StockLineRow,
) -> InvoiceLineRow {
    let mut update_line = InvoiceLineRow {
        id,
        invoice_id,
        item_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        number_of_packs,
        item_name,
        item_code,
        stock_line_id: Some(stock_line_id),
        total_after_tax,
    };

    update_line.number_of_packs = input
        .number_of_packs
        .map(u32_to_i32)
        .unwrap_or(update_line.number_of_packs);

    update_line.total_after_tax = update_line.cost_price_per_pack
        * update_line.pack_size as f64
        * update_line.number_of_packs as f64;

    update_line
}
