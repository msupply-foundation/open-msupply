use crate::{
    invoice::common::{calculate_total_after_tax, generate_invoice_user_id_update},
    invoice_line::inbound_shipment_line::{
        generate::convert_invoice_line_to_single_pack, generate_batch,
    },
    store_preference::get_store_preferences,
    u32_to_i32,
};
use repository::{
    InvoiceLineRow, InvoiceRow, InvoiceRowStatus, ItemRow, RepositoryError, StockLineRow,
    StorageConnection,
};

use super::UpdateInboundShipmentLine;

pub fn generate(
    connection: &StorageConnection,
    user_id: &str,
    input: UpdateInboundShipmentLine,
    current_line: InvoiceLineRow,
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

    let update_line = generate_line(input, current_line, new_item_option);

    let mut update_line = match store_preferences.pack_to_one {
        true => convert_invoice_line_to_single_pack(update_line),
        false => update_line,
    };

    let upsert_batch_option = if existing_invoice_row.status != InvoiceRowStatus::New {
        let new_batch = generate_batch(
            &existing_invoice_row.store_id,
            update_line.clone(),
            batch_to_delete_id.is_none(),
            &existing_invoice_row.name_id,
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
    UpdateInboundShipmentLine {
        pack_size,
        batch,
        cost_price_per_pack,
        sell_price_per_pack,
        expiry_date,
        number_of_packs,
        location_id,
        id: _,
        item_id: _,
        total_before_tax,
        tax,
    }: UpdateInboundShipmentLine,
    current_line: InvoiceLineRow,
    new_item_option: Option<ItemRow>,
) -> InvoiceLineRow {
    let mut update_line = current_line;

    update_line.pack_size = pack_size.map(u32_to_i32).unwrap_or(update_line.pack_size);
    update_line.batch = batch.or(update_line.batch);
    update_line.location_id = location_id.or(update_line.location_id);
    update_line.expiry_date = expiry_date.or(update_line.expiry_date);
    update_line.sell_price_per_pack =
        sell_price_per_pack.unwrap_or(update_line.sell_price_per_pack);
    update_line.cost_price_per_pack =
        cost_price_per_pack.unwrap_or(update_line.cost_price_per_pack);
    update_line.number_of_packs = number_of_packs.unwrap_or(update_line.number_of_packs);
    update_line.tax = tax.map(|tax| tax.percentage).unwrap_or(update_line.tax);

    if let Some(item) = new_item_option {
        update_line.item_id = item.id;
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
        calculate_total_after_tax(update_line.total_before_tax, update_line.tax);

    update_line
}
