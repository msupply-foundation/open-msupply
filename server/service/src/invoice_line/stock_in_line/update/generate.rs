use crate::{
    invoice::common::{
        calculate_foreign_currency_total, calculate_total_after_tax,
        generate_invoice_user_id_update,
    },
    invoice_line::{
        inbound_shipment_line::generate::convert_invoice_line_to_single_pack,
        stock_in_line::{generate_batch, StockLineInput},
    },
    store_preference::get_store_preferences,
    u32_to_i32,
};
use repository::{
    InvoiceLine, InvoiceLineRow, InvoiceRow, InvoiceStatus, ItemRow, RepositoryError, StockLineRow,
    StorageConnection,
};

use super::UpdateStockInLine;

pub fn generate(
    connection: &StorageConnection,
    user_id: &str,
    input: UpdateStockInLine,
    current_line: InvoiceLine,
    new_item_option: Option<ItemRow>,
    existing_invoice_row: InvoiceRow,
) -> Result<
    (
        Option<InvoiceRow>,
        InvoiceLineRow,
        Option<StockLineRow>,
        Option<String>,
    ),
    RepositoryError,
> {
    let store_preferences = get_store_preferences(connection, &existing_invoice_row.store_id)?;

    let batch_to_delete_id = get_batch_to_delete_id(&current_line, &new_item_option);

    let update_line = generate_line(
        connection,
        input,
        current_line.invoice_line_row,
        new_item_option,
        existing_invoice_row.currency_id.clone(),
        &existing_invoice_row.currency_rate,
    )?;

    let mut update_line = match store_preferences.pack_to_one {
        true => convert_invoice_line_to_single_pack(update_line),
        false => update_line,
    };

    let upsert_batch_option = if existing_invoice_row.status != InvoiceStatus::New {
        let new_batch = generate_batch(
            // There will be a batch_to_delete_id if the item has changed
            // If item has changed, we want a new stock line, otherwise keep existing
            batch_to_delete_id.is_none(),
            update_line.clone(),
            StockLineInput {
                store_id: existing_invoice_row.store_id.clone(),
                supplier_link_id: existing_invoice_row.name_link_id.clone(),
                on_hold: false,
                barcode_id: None,
            },
        );
        update_line.stock_line_id = Some(new_batch.id.clone());
        Some(new_batch)
    } else {
        None
    };

    Ok((
        generate_invoice_user_id_update(user_id, existing_invoice_row),
        update_line,
        upsert_batch_option,
        batch_to_delete_id,
    ))
}

fn get_batch_to_delete_id(
    current_line: &InvoiceLine,
    new_item_option: &Option<ItemRow>,
) -> Option<String> {
    if let (Some(new_item), Some(stock_line_id)) = (
        new_item_option,
        &current_line.invoice_line_row.stock_line_id,
    ) {
        if new_item.id != current_line.item_row.id {
            return Some(stock_line_id.clone());
        }
    }
    None
}

fn generate_line(
    connection: &StorageConnection,
    UpdateStockInLine {
        pack_size,
        batch,
        cost_price_per_pack,
        sell_price_per_pack,
        expiry_date,
        number_of_packs,
        note,
        location,
        id: _,
        item_id: _,
        total_before_tax,
        tax_percentage,
        r#type: _,
    }: UpdateStockInLine,
    current_line: InvoiceLineRow,
    new_item_option: Option<ItemRow>,
    currency_id: Option<String>,
    currency_rate: &f64,
) -> Result<InvoiceLineRow, RepositoryError> {
    let mut update_line = current_line;

    update_line.pack_size = pack_size.map(u32_to_i32).unwrap_or(update_line.pack_size);
    update_line.batch = batch.or(update_line.batch);
    update_line.note = note.or(update_line.note);
    update_line.location_id = location.map(|l| l.value).unwrap_or(update_line.location_id);
    update_line.expiry_date = expiry_date.or(update_line.expiry_date);
    update_line.sell_price_per_pack =
        sell_price_per_pack.unwrap_or(update_line.sell_price_per_pack);
    update_line.cost_price_per_pack =
        cost_price_per_pack.unwrap_or(update_line.cost_price_per_pack);
    update_line.number_of_packs = number_of_packs.unwrap_or(update_line.number_of_packs);
    update_line.tax_percentage = tax_percentage
        .map(|tax| tax.percentage)
        .unwrap_or(update_line.tax_percentage);
    update_line.foreign_currency_price_before_tax = calculate_foreign_currency_total(
        connection,
        update_line.total_before_tax,
        currency_id,
        currency_rate,
    )?;

    if let Some(item) = new_item_option {
        update_line.item_link_id = item.id;
        update_line.item_code = item.code;
        update_line.item_name = item.name;
    }

    update_line.total_before_tax = if let Some(total_before_tax) = total_before_tax {
        total_before_tax
    } else if number_of_packs.is_some() || cost_price_per_pack.is_some() {
        update_line.cost_price_per_pack * update_line.number_of_packs as f64
    } else {
        update_line.total_before_tax
    };

    update_line.total_after_tax =
        calculate_total_after_tax(update_line.total_before_tax, update_line.tax_percentage);

    Ok(update_line)
}
