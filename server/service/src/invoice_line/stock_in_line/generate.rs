use repository::{
    InvoiceLineRow, RepositoryError, StockLineRow, StockLineRowRepository, StorageConnection,
};
use util::uuid::uuid;

pub fn convert_stock_line_to_single_pack(stock_line: StockLineRow) -> StockLineRow {
    StockLineRow {
        total_number_of_packs: stock_line.total_number_of_packs * stock_line.pack_size as f64,
        available_number_of_packs: stock_line.available_number_of_packs
            * stock_line.pack_size as f64,
        cost_price_per_pack: stock_line.cost_price_per_pack / stock_line.pack_size as f64,
        sell_price_per_pack: stock_line.sell_price_per_pack / stock_line.pack_size as f64,
        pack_size: 1,
        ..stock_line
    }
}

pub fn convert_invoice_line_to_single_pack(invoice_line: InvoiceLineRow) -> InvoiceLineRow {
    InvoiceLineRow {
        number_of_packs: invoice_line.number_of_packs * invoice_line.pack_size as f64,
        sell_price_per_pack: invoice_line.sell_price_per_pack / invoice_line.pack_size as f64,
        cost_price_per_pack: invoice_line.cost_price_per_pack / invoice_line.pack_size as f64,
        pack_size: 1,
        ..invoice_line
    }
}
pub struct StockLineInput {
    pub store_id: String,
    pub on_hold: bool,
    pub barcode_id: Option<String>,
    pub supplier_link_id: String,
}

struct StockLevels {
    available_number_of_packs: f64,
    total_number_of_packs: f64,
}

pub fn generate_batch(
    connection: &StorageConnection,
    stock_line_id: Option<String>,
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
        ..
    }: InvoiceLineRow,
    StockLineInput {
        store_id,
        on_hold,
        barcode_id,
        supplier_link_id,
    }: StockLineInput,
) -> Result<StockLineRow, RepositoryError> {
    // Generate new stock line id if not provided
    let stock_line_id = match stock_line_id {
        Some(stock_line_id) => stock_line_id,
        None => uuid(),
    };

    let existing_stock_line =
        StockLineRowRepository::new(connection).find_one_by_id_option(&stock_line_id)?;

    // Update existing stock level values if stock line already exists
    let StockLevels {
        available_number_of_packs,
        total_number_of_packs,
    } = get_updated_stock_levels(&existing_stock_line, number_of_packs);

    // Use existing barcode id if exists
    let barcode_id = barcode_id.or_else(|| {
        existing_stock_line
            .map(|stock_line| stock_line.barcode_id)
            .flatten()
    });

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
        supplier_link_id: Some(supplier_link_id),
        on_hold,
        barcode_id,
    };

    Ok(stock_line_row)
}

fn get_updated_stock_levels(
    existing_stock_line: &Option<StockLineRow>,
    introduced_number_of_packs: f64,
) -> StockLevels {
    match existing_stock_line {
        Some(stock_line) => StockLevels {
            available_number_of_packs: stock_line.available_number_of_packs
                + introduced_number_of_packs,
            total_number_of_packs: stock_line.total_number_of_packs + introduced_number_of_packs,
        },
        None => StockLevels {
            available_number_of_packs: introduced_number_of_packs,
            total_number_of_packs: introduced_number_of_packs,
        },
    }
}
