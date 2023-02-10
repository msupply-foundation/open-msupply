use crate::{
    invoice::common::{calculate_total_after_tax, generate_invoice_user_id_update},
    invoice_line::generate_batch,
    store_preference::get_store_preferences,
    u32_to_i32,
};
use repository::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, ItemRow, RepositoryError,
    StockLineRow, StorageConnection, StorePreferenceRow,
};

use super::InsertInboundShipmentLine;

pub fn generate(
    connection: &StorageConnection,
    user_id: &str,
    input: InsertInboundShipmentLine,
    item_row: ItemRow,
    existing_invoice_row: InvoiceRow,
) -> Result<(Option<InvoiceRow>, InvoiceLineRow, Option<StockLineRow>), RepositoryError> {
    let store_preferences = get_store_preferences(connection, &existing_invoice_row.store_id)?;

    let mut new_line = generate_line(
        store_preferences.clone(),
        input,
        item_row,
        existing_invoice_row.clone(),
    );

    let new_batch_option = if existing_invoice_row.status != InvoiceRowStatus::New {
        let new_batch = generate_batch(
            Some(store_preferences),
            &existing_invoice_row.store_id,
            new_line.clone(),
            false,
            &existing_invoice_row.name_id,
        );
        new_line.stock_line_id = Some(new_batch.id.clone());
        Some(new_batch)
    } else {
        None
    };

    Ok((
        generate_invoice_user_id_update(user_id, existing_invoice_row),
        new_line,
        new_batch_option,
    ))
}

fn generate_line(
    store_preferences: StorePreferenceRow,
    InsertInboundShipmentLine {
        id,
        invoice_id,
        item_id,
        mut pack_size,
        batch,
        expiry_date,
        mut sell_price_per_pack,
        mut cost_price_per_pack,
        mut number_of_packs,
        location_id,
        total_before_tax,
        tax: _,
    }: InsertInboundShipmentLine,
    ItemRow {
        name: item_name,
        code: item_code,
        ..
    }: ItemRow,
    InvoiceRow { tax, .. }: InvoiceRow,
) -> InvoiceLineRow {
    if store_preferences.pack_to_one {
        number_of_packs = number_of_packs * pack_size as f64;
        sell_price_per_pack = sell_price_per_pack / pack_size as f64;
        cost_price_per_pack = cost_price_per_pack / pack_size as f64;
        pack_size = 1;
    }

    let total_before_tax = total_before_tax.unwrap_or(cost_price_per_pack * number_of_packs as f64);
    let total_after_tax = calculate_total_after_tax(total_before_tax, tax);

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
        number_of_packs,
        item_name,
        item_code,
        stock_line_id: None,
        total_before_tax,
        total_after_tax,
        tax,
        note: None,
        inventory_adjustment_reason_id: None,
    }
}
