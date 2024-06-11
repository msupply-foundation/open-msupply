use crate::StockLineRow;

use super::MockData;

// stocktake line insert:

pub fn mock_new_stock_line_for_stocktake_a() -> StockLineRow {
    StockLineRow {
        id: String::from("mock_new_stock_line_for_stocktake_a"),
        item_link_id: String::from("item_a"),
        location_id: None,
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_batch_b")),
        available_number_of_packs: 20.0,
        pack_size: 1.0,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 30.0,
        expiry_date: None,
        on_hold: false,
        note: None,
        supplier_link_id: Some(String::from("name_store_b")),
        barcode_id: None,
    }
}

pub fn test_stocktake_line_data() -> MockData {
    let mut data: MockData = Default::default();

    data.stock_lines = vec![mock_new_stock_line_for_stocktake_a()];
    data
}
