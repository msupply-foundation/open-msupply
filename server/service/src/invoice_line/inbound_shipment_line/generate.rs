use repository::{InvoiceLineRow, StockLineRow};
use util::uuid::uuid;

pub fn convert_stock_line_to_single_pack(stock_line: StockLineRow) -> StockLineRow {
    StockLineRow {
        total_number_of_packs: stock_line.total_number_of_packs * stock_line.pack_size as f64,
        available_number_of_packs: stock_line.available_number_of_packs
            * stock_line.pack_size as f64,
        cost_price_per_pack: stock_line.cost_price_per_pack / stock_line.pack_size as f64,
        sell_price_per_pack: stock_line.sell_price_per_pack / stock_line.pack_size as f64,
        pack_size: 1.0,
        ..stock_line
    }
}

pub fn convert_invoice_line_to_single_pack(invoice_line: InvoiceLineRow) -> InvoiceLineRow {
    InvoiceLineRow {
        number_of_packs: invoice_line.number_of_packs * invoice_line.pack_size as f64,
        sell_price_per_pack: invoice_line.sell_price_per_pack / invoice_line.pack_size as f64,
        cost_price_per_pack: invoice_line.cost_price_per_pack / invoice_line.pack_size as f64,
        pack_size: 1.0,
        ..invoice_line
    }
}

pub fn generate_batch(
    store_id: &str,
    InvoiceLineRow {
        stock_line_id,
        item_link_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        number_of_packs,
        location_id,
        note,
        ..
    }: InvoiceLineRow,
    keep_existing_batch: bool,
    supplier_link_id: &str,
) -> StockLineRow {
    // Generate new id if requested via parameter or if stock_line_id is not already set on line
    let stock_line_id = match (stock_line_id, keep_existing_batch) {
        (Some(stock_line_id), true) => stock_line_id,
        _ => uuid(),
    };

    StockLineRow {
        id: stock_line_id,
        item_link_id,
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
        supplier_link_id: Some(supplier_link_id.to_string()),
        barcode_id: None,
    }
}
