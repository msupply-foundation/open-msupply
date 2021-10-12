use crate::{
    database::{
        repository::StorageConnection,
        schema::{InvoiceLineRow, InvoiceRow, InvoiceRowStatus, ItemRow, StockLineRow},
    },
    domain::supplier_invoice::InsertSupplierInvoiceLine,
    service::{invoice::current_store_id, u32_to_i32},
};

use super::InsertSupplierInvoiceLineError;

pub fn generate(
    input: InsertSupplierInvoiceLine,
    item_row: ItemRow,
    InvoiceRow { status, .. }: InvoiceRow,
    connection: &StorageConnection,
) -> Result<(InvoiceLineRow, Option<StockLineRow>), InsertSupplierInvoiceLineError> {
    let mut new_line = generate_line(input, item_row);

    let new_batch_option = if status != InvoiceRowStatus::Draft {
        let new_batch = generate_batch(new_line.clone(), connection)?;
        new_line.stock_line_id = Some(new_batch.id.clone());
        Some(new_batch)
    } else {
        None
    };

    Ok((new_line, new_batch_option))
}

fn generate_line(
    InsertSupplierInvoiceLine {
        id,
        invoice_id,
        item_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        number_of_packs,
    }: InsertSupplierInvoiceLine,
    ItemRow {
        name: item_name,
        code: item_code,
        ..
    }: ItemRow,
) -> InvoiceLineRow {
    let total_after_tax = cost_price_per_pack * pack_size as f64 * number_of_packs as f64;

    InvoiceLineRow {
        id,
        invoice_id,
        item_id,
        pack_size: u32_to_i32(pack_size),
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        number_of_packs: u32_to_i32(number_of_packs),
        item_name,
        item_code,
        stock_line_id: None,
        total_after_tax,
    }
}

fn generate_batch(
    InvoiceLineRow {
        id,
        invoice_id,
        item_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        number_of_packs,
        ..
    }: InvoiceLineRow,
    connection: &StorageConnection,
) -> Result<StockLineRow, InsertSupplierInvoiceLineError> {
    let batch = StockLineRow {
        id,
        item_id,
        store_id: current_store_id(connection)?,
        batch,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        available_number_of_packs: number_of_packs,
        total_number_of_packs: number_of_packs,
        expiry_date,
    };

    Ok(batch)
}
