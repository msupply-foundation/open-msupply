use repository::{
    InvoiceLineRow, RepositoryError, StockLineRow, StockLineRowRepository, StorageConnection,
};
use util::uuid::uuid;

pub fn convert_stock_line_to_single_pack(stock_line: StockLineRow) -> StockLineRow {
    StockLineRow {
        total_number_of_packs: stock_line.total_number_of_packs * stock_line.pack_size,
        available_number_of_packs: stock_line.available_number_of_packs * stock_line.pack_size,
        cost_price_per_pack: stock_line.cost_price_per_pack / stock_line.pack_size,
        sell_price_per_pack: stock_line.sell_price_per_pack / stock_line.pack_size,
        pack_size: 1.0,
        ..stock_line
    }
}

pub fn convert_invoice_line_to_single_pack(invoice_line: InvoiceLineRow) -> InvoiceLineRow {
    InvoiceLineRow {
        number_of_packs: invoice_line.number_of_packs * invoice_line.pack_size,
        sell_price_per_pack: invoice_line.sell_price_per_pack / invoice_line.pack_size,
        cost_price_per_pack: invoice_line.cost_price_per_pack / invoice_line.pack_size,
        pack_size: 1.0,
        ..invoice_line
    }
}
pub struct StockLineInput {
    pub stock_line_id: Option<String>,
    pub store_id: String,
    pub on_hold: bool,
    pub barcode_id: Option<String>,
    pub supplier_link_id: String,
    pub overwrite_stock_levels: bool,
}

struct StockLevels {
    available_number_of_packs: f64,
    total_number_of_packs: f64,
}

pub fn generate_batch(
    connection: &StorageConnection,
    InvoiceLineRow {
        item_link_id,
        pack_size,
        batch,
        expiry_date,
        sell_price_per_pack,
        cost_price_per_pack,
        number_of_packs,
        location_id,
        note,
        item_variant_id,
        ..
    }: InvoiceLineRow,
    StockLineInput {
        stock_line_id,
        store_id,
        on_hold,
        barcode_id,
        supplier_link_id,
        overwrite_stock_levels,
    }: StockLineInput,
) -> Result<StockLineRow, RepositoryError> {
    // Generate new stock line id if not provided
    let stock_line_id = match stock_line_id {
        Some(stock_line_id) => stock_line_id,
        None => uuid(),
    };

    let existing_stock_line =
        StockLineRowRepository::new(connection).find_one_by_id(&stock_line_id)?;

    // Update existing stock level values if stock line already exists
    let StockLevels {
        available_number_of_packs,
        total_number_of_packs,
    } = get_updated_stock_levels(
        &existing_stock_line,
        number_of_packs,
        overwrite_stock_levels,
    );

    let (barcode_id, supplier_link_id) = match existing_stock_line {
        Some(stock_line) => (
            // if no new barcode, use the existing one if exists
            barcode_id.or(stock_line.barcode_id),
            // if stock_line already has supplier, use that
            stock_line.supplier_link_id.or(Some(supplier_link_id)),
        ),
        None => (barcode_id, Some(supplier_link_id)),
    };

    let stock_line_row = StockLineRow {
        id: stock_line_id,
        item_link_id,
        store_id,
        location_id,
        batch,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        available_number_of_packs,
        total_number_of_packs,
        expiry_date,
        note,
        supplier_link_id,
        on_hold,
        barcode_id,
        item_variant_id,
    };

    Ok(stock_line_row)
}

fn get_updated_stock_levels(
    existing_stock_line: &Option<StockLineRow>,
    introduced_number_of_packs: f64,
    overwrite_stock_levels: bool,
) -> StockLevels {
    match (existing_stock_line, overwrite_stock_levels) {
        (Some(stock_line), false) => StockLevels {
            available_number_of_packs: stock_line.available_number_of_packs
                + introduced_number_of_packs,
            total_number_of_packs: stock_line.total_number_of_packs + introduced_number_of_packs,
        },
        _ => StockLevels {
            available_number_of_packs: introduced_number_of_packs,
            total_number_of_packs: introduced_number_of_packs,
        },
    }
}
