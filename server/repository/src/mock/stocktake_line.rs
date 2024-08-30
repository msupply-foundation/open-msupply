use crate::StocktakeLineRow;

use super::{mock_item_a, mock_item_b};

pub fn mock_stocktake_line_a() -> StocktakeLineRow {
    StocktakeLineRow {
        id: "stocktake_line_a".to_string(),
        stocktake_id: "stocktake_a".to_string(),
        stock_line_id: Some("item_a_line_a".to_string()),
        location_id: None,
        comment: None,
        snapshot_number_of_packs: 40.0,
        counted_number_of_packs: Some(8.0),
        item_link_id: "item_a".to_string(),
        item_name: mock_item_a().name,
        expiry_date: None,
        batch: None,
        pack_size: None,
        cost_price_per_pack: None,
        sell_price_per_pack: None,
        note: None,
        inventory_adjustment_reason_id: None,
    }
}

pub fn mock_stocktake_line_b() -> StocktakeLineRow {
    StocktakeLineRow {
        id: "stocktake_line_b".to_string(),
        stocktake_id: "stocktake_b".to_string(),
        stock_line_id: Some("item_a_line_a".to_string()),
        location_id: None,
        comment: None,
        snapshot_number_of_packs: 10.0,
        counted_number_of_packs: None,
        item_link_id: "item_b".to_string(),
        item_name: mock_item_b().name,
        expiry_date: None,
        batch: None,
        pack_size: None,
        cost_price_per_pack: None,
        sell_price_per_pack: None,
        note: None,
        inventory_adjustment_reason_id: None,
    }
}

pub fn mock_stocktake_line_data() -> Vec<StocktakeLineRow> {
    vec![mock_stocktake_line_a(), mock_stocktake_line_b()]
}
