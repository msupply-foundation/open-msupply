use crate::schema::StockTakeLineRow;

pub fn mock_stock_take_line_a() -> StockTakeLineRow {
    StockTakeLineRow {
        id: "stock_take_line_a".to_string(),
        stock_take_id: "stock_take_a".to_string(),
        stock_line_id: "item_a_line_a".to_string(),
        location_id: None,
        batch: None,
        comment: None,
        cost_price_pack: 0.0,
        sell_price_pack: 0.0,
        snapshot_number_of_packs: 10,
        counted_number_of_packs: 8,
    }
}

pub fn mock_stock_take_line_b() -> StockTakeLineRow {
    StockTakeLineRow {
        id: "stock_take_line_b".to_string(),
        stock_take_id: "stock_take_b".to_string(),
        stock_line_id: "item_a_line_a".to_string(),
        location_id: None,
        batch: None,
        comment: None,
        cost_price_pack: 0.0,
        sell_price_pack: 0.0,
        snapshot_number_of_packs: 10,
        counted_number_of_packs: 8,
    }
}

pub fn mock_stock_take_line_data() -> Vec<StockTakeLineRow> {
    vec![mock_stock_take_line_a(), mock_stock_take_line_b()]
}
