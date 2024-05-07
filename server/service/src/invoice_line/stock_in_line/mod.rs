use repository::{InvoiceLineRow, InvoiceType, StockLineRow};
use util::uuid::uuid;

pub mod delete;
pub mod insert;
pub mod update;
pub use self::delete::*;
pub use self::insert::*;
pub use self::update::*;

#[derive(Clone, Debug, Default, PartialEq)]
pub enum StockInType {
    #[default]
    InboundReturn,
    InventoryAddition,
}

impl StockInType {
    pub fn to_domain(&self) -> InvoiceType {
        match self {
            StockInType::InboundReturn => InvoiceType::InboundReturn,
            StockInType::InventoryAddition => InvoiceType::InventoryAddition,
        }
    }
}

pub struct StockLineInput {
    pub store_id: String,
    pub on_hold: bool,
    pub barcode_id: Option<String>,
    pub supplier_link_id: String,
}

pub fn generate_batch(
    keep_existing_batch: bool,
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
    StockLineInput {
        store_id,
        on_hold,
        barcode_id,
        supplier_link_id,
    }: StockLineInput,
) -> StockLineRow {
    // Generate new id if requested via parameter or if stock_line_id is not already set on line
    let stock_line_id = match (stock_line_id, keep_existing_batch) {
        (Some(stock_line_id), true) => stock_line_id,
        _ => uuid(),
    };

    StockLineRow {
        id: stock_line_id,
        item_link_id,
        store_id,
        location_id,
        batch,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        available_number_of_packs: number_of_packs,
        total_number_of_packs: number_of_packs,
        expiry_date,
        note,
        supplier_link_id: Some(supplier_link_id),
        on_hold,
        barcode_id,
    }
}
