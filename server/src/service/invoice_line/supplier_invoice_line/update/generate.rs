use crate::{
    database::{
        repository::StorageConnection,
        schema::{InvoiceLineRow, InvoiceRow, InvoiceRowStatus, ItemRow, StockLineRow},
    },
    domain::supplier_invoice::UpdateSupplierInvoiceLine,
    service::{invoice_line::supplier_invoice_line::generate_batch, u32_to_i32},
};

use super::UpdateSupplierInvoiceLineError;

pub fn generate(
    input: UpdateSupplierInvoiceLine,
    current_line: InvoiceLineRow,
    new_item_option: Option<ItemRow>,
    InvoiceRow { status, .. }: InvoiceRow,
    connection: &StorageConnection,
) -> Result<(InvoiceLineRow, Option<StockLineRow>, Option<String>), UpdateSupplierInvoiceLineError>
{
    let batch_to_delete_id = get_batch_to_delete_id(&current_line, &new_item_option);

    let mut update_line = generate_line(input, current_line, new_item_option);

    let upsert_batch_option = if status != InvoiceRowStatus::Draft {
        let new_batch = generate_batch(
            update_line.clone(),
            batch_to_delete_id.is_none(),
            connection,
        )?;
        update_line.stock_line_id = Some(new_batch.id.clone());
        Some(new_batch)
    } else {
        None
    };

    Ok((update_line, upsert_batch_option, batch_to_delete_id))
}

fn get_batch_to_delete_id(
    current_line: &InvoiceLineRow,
    new_item_option: &Option<ItemRow>,
) -> Option<String> {
    if let (Some(new_item), Some(stock_line_id)) = (new_item_option, &current_line.stock_line_id) {
        if new_item.id != current_line.item_id {
            return Some(stock_line_id.clone());
        }
    }
    None
}

fn generate_line(
    UpdateSupplierInvoiceLine {
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        number_of_packs,
        ..
    }: UpdateSupplierInvoiceLine,
    current_line: InvoiceLineRow,
    new_item_option: Option<ItemRow>,
) -> InvoiceLineRow {
    let mut update_line = current_line;

    update_line.pack_size = pack_size.map(u32_to_i32).unwrap_or(update_line.pack_size);
    update_line.batch = batch.or(update_line.batch);
    update_line.expiry_date = expiry_date.or(update_line.expiry_date);
    update_line.sell_price_per_pack =
        sell_price_per_pack.unwrap_or(update_line.sell_price_per_pack);
    update_line.cost_price_per_pack =
        cost_price_per_pack.unwrap_or(update_line.cost_price_per_pack);
    update_line.number_of_packs = number_of_packs
        .map(u32_to_i32)
        .unwrap_or(update_line.number_of_packs);

    if let Some(item) = new_item_option {
        update_line.item_id = item.id;
        update_line.item_code = item.code;
        update_line.item_name = item.name;
    }

    update_line.total_after_tax = update_line.cost_price_per_pack
        * update_line.pack_size as f64
        * update_line.number_of_packs as f64;

    update_line
}
