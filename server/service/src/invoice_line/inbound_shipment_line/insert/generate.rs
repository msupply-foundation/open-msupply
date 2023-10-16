use crate::{
    invoice::common::{calculate_total_after_tax, generate_invoice_user_id_update},
    invoice_line::{
        generate_batch,
        inbound_shipment_line::generate::{
            convert_invoice_line_to_single_pack, convert_stock_line_to_single_pack,
        },
    },
    store_preference::get_store_preferences,
    u32_to_i32,
};
use repository::{
    InvoiceLineRow, InvoiceLineRowType, InvoiceRow, InvoiceRowStatus, ItemRow, RepositoryError,
    StockLineRow, StorageConnection,
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

    let new_line = generate_line(input, item_row, existing_invoice_row.clone());

    let mut new_line = match store_preferences.pack_to_one {
        true => convert_invoice_line_to_single_pack(new_line),
        false => new_line,
    };

    let new_batch_option = if existing_invoice_row.status != InvoiceRowStatus::New {
        let new_batch = generate_batch(
            &existing_invoice_row.store_id,
            new_line.clone(),
            false,
            &existing_invoice_row.name_id,
        );
        new_line.stock_line_id = Some(new_batch.id.clone());

        let new_batch = match store_preferences.pack_to_one {
            true => convert_stock_line_to_single_pack(new_batch),
            false => new_batch,
        };

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
        location,
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
    let mut invoice_line_row: InvoiceLineRow = InvoiceLineRow::default();
    // if location has been passed, update sensor_row to the value passed (including if this is null)
    // A null value being passed as the LocationUpdate is the unassignment of location
    // no LocationUpdate being passed is the location not being updated

    if let Some(location) = location {
        invoice_line_row.location_id = location.location_id;
    };

    let total_before_tax = total_before_tax.unwrap_or(cost_price_per_pack * number_of_packs as f64);
    let total_after_tax = calculate_total_after_tax(total_before_tax, tax);
    invoice_line_row.id = id;
    invoice_line_row.invoice_id = invoice_id;
    invoice_line_row.item_id = item_id;
    invoice_line_row.pack_size = u32_to_i32(pack_size);
    invoice_line_row.batch = batch;
    invoice_line_row.expiry_date = expiry_date;
    invoice_line_row.sell_price_per_pack = sell_price_per_pack;
    invoice_line_row.cost_price_per_pack = cost_price_per_pack;
    invoice_line_row.r#type = InvoiceLineRowType::StockIn;
    invoice_line_row.number_of_packs = number_of_packs;
    invoice_line_row.item_name = item_name;
    invoice_line_row.item_code = item_code;
    invoice_line_row.stock_line_id = None;
    invoice_line_row.total_before_tax = total_before_tax;
    invoice_line_row.total_after_tax = total_after_tax;
    invoice_line_row.tax = tax;
    invoice_line_row.note = None;
    invoice_line_row.inventory_adjustment_reason_id = None;
    invoice_line_row
}
