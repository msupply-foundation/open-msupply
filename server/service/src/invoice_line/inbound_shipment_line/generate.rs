use repository::{InvoiceLineRow, StockLineRow, StorePreferenceRow};
use util::uuid::uuid;

pub fn generate_batch(
    store_preferences: Option<StorePreferenceRow>,
    store_id: &str,
    InvoiceLineRow {
        stock_line_id,
        item_id,
        mut pack_size,
        batch,
        expiry_date,
        mut sell_price_per_pack,
        mut cost_price_per_pack,
        mut number_of_packs,
        location_id,
        note,
        ..
    }: InvoiceLineRow,
    keep_existing_batch: bool,
    supplier_id: &str,
) -> StockLineRow {
    // Generate new id if requested via parameter or if stock_line_id is not already set on line
    let stock_line_id = match (stock_line_id, keep_existing_batch) {
        (Some(stock_line_id), true) => stock_line_id,
        _ => uuid(),
    };

    if store_preferences.unwrap_or_default().pack_to_one {
        number_of_packs = number_of_packs * pack_size as f64;
        sell_price_per_pack = sell_price_per_pack / pack_size as f64;
        cost_price_per_pack = cost_price_per_pack / pack_size as f64;
        pack_size = 1;
    }

    StockLineRow {
        id: stock_line_id,
        item_id,
        store_id: store_id.to_string(),
        location_id,
        batch,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        available_number_of_packs: number_of_packs,
        total_number_of_packs: number_of_packs,
        expiry_date,
        on_hold: false,
        note,
        supplier_id: Some(supplier_id.to_string()),
    }
}
