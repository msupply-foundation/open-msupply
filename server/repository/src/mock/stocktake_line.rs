use crate::StocktakeLineRow;

use super::{mock_item_a, mock_item_b};

pub fn mock_stocktake_line_a() -> StocktakeLineRow {
    StocktakeLineRow {
        id: "stocktake_line_a".to_string(),
        stocktake_id: "stocktake_a".to_string(),
        stock_line_id: Some("item_a_line_a".to_string()),
        snapshot_number_of_packs: 40.0,
        counted_number_of_packs: Some(8.0),
        item_link_id: "item_a".to_string(),
        item_name: mock_item_a().name,
        ..Default::default()
    }
}

pub fn mock_stocktake_line_b() -> StocktakeLineRow {
    StocktakeLineRow {
        id: "stocktake_line_b".to_string(),
        stocktake_id: "stocktake_b".to_string(),
        stock_line_id: Some("item_a_line_a".to_string()),
        snapshot_number_of_packs: 10.0,
        item_link_id: "item_b".to_string(),
        item_name: mock_item_b().name,
        ..Default::default()
    }
}

pub fn mock_stocktake_line_data() -> Vec<StocktakeLineRow> {
    vec![mock_stocktake_line_a(), mock_stocktake_line_b()]
}
