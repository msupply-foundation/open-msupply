use repository::{StockLine, StocktakeLineRow};

use super::InsertStocktakeLine;

pub fn generate(
    stock_line: Option<StockLine>,
    item_id: String,
    item_name: String,
    InsertStocktakeLine {
        id,
        stocktake_id,
        stock_line_id,
        location,
        comment,
        counted_number_of_packs,
        item_id: _,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
        inventory_adjustment_reason_id,
    }: InsertStocktakeLine,
) -> StocktakeLineRow {
    let snapshot_number_of_packs = if let Some(stock_line) = stock_line {
        stock_line.stock_line_row.total_number_of_packs
    } else {
        0.0
    };
    StocktakeLineRow {
        id,
        stocktake_id,
        stock_line_id,
        location_id: location.map(|l| l.value).unwrap_or_default(),
        comment,
        snapshot_number_of_packs,
        counted_number_of_packs,
        item_link_id: item_id.to_string(),
        item_name,
        batch,
        expiry_date,
        pack_size,
        cost_price_per_pack,
        sell_price_per_pack,
        note,
        inventory_adjustment_reason_id,
    }
}
