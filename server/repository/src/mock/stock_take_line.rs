use crate::schema::StockTakeLineRow;

pub fn mock_stock_take_line_a() -> StockTakeLineRow {
    StockTakeLineRow {
        id: "stock_take_line_a".to_string(),
        stock_take_id: "stock_take_a".to_string(),
        stock_line_id: Some("item_a_line_a".to_string()),
        location_id: None,
        comment: None,
        snapshot_number_of_packs: 10,
        counted_number_of_packs: Some(8),
        item_id: "item_a".to_string(),
        expiry_date: None,
        batch: None,
        pack_size: None,
        cost_price_per_pack: None,
        sell_price_per_pack: None,
        note: None,
    }
}

pub fn mock_stock_take_line_b() -> StockTakeLineRow {
    StockTakeLineRow {
        id: "stock_take_line_b".to_string(),
        stock_take_id: "stock_take_b".to_string(),
        stock_line_id: Some("item_a_line_a".to_string()),
        location_id: None,
        comment: None,
        snapshot_number_of_packs: 10,
        counted_number_of_packs: None,
        item_id: "item_b".to_string(),
        expiry_date: None,
        batch: None,
        pack_size: None,
        cost_price_per_pack: None,
        sell_price_per_pack: None,
        note: None,
    }
}

pub fn mock_stock_take_line_data() -> Vec<StockTakeLineRow> {
    vec![mock_stock_take_line_a(), mock_stock_take_line_b()]
}
