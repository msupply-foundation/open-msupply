use crate::database::schema::StockLineRow;

pub fn mock_item_a_lines() -> Vec<StockLineRow> {
    let mock_item_a_line_a: StockLineRow = StockLineRow {
        id: String::from("item_a_line_a"),
        item_id: String::from("item_a"),
        store_id: String::from("store_a"),
        batch: None,
        available_number_of_packs: 30,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 40,
        expiry_date: None,
    };

    let mock_item_a_line_b: StockLineRow = StockLineRow {
        id: String::from("item_a_line_b"),
        item_id: String::from("item_a"),
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_batch_b")),
        available_number_of_packs: 20,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 30,
        expiry_date: None,
    };

    vec![mock_item_a_line_a, mock_item_a_line_b]
}

pub fn mock_item_b_lines() -> Vec<StockLineRow> {
    let mock_item_b_line_a: StockLineRow = StockLineRow {
        id: String::from("item_b_line_a"),
        item_id: String::from("item_b"),
        store_id: String::from("store_a"),
        batch: Some(String::from("item_b_batch_a")),
        available_number_of_packs: 3,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 30,
        expiry_date: None,
    };

    let mock_item_b_line_b: StockLineRow = StockLineRow {
        id: String::from("item_b_line_b"),
        item_id: String::from("item_b"),
        store_id: String::from("store_a"),
        batch: Some(String::from("item_b_batch_b")),
        available_number_of_packs: 4,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 25,
        expiry_date: None,
    };

    vec![mock_item_b_line_a, mock_item_b_line_b]
}

pub fn mock_item_c_lines() -> Vec<StockLineRow> {
    let mock_item_c_line_a: StockLineRow = StockLineRow {
        id: String::from("item_c_line_a"),
        item_id: String::from("item_c"),
        store_id: String::from("store_a"),
        batch: Some(String::from("item_c_batch_a")),
        available_number_of_packs: 5,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 1,
        expiry_date: None,
    };

    let mock_item_c_line_b: StockLineRow = StockLineRow {
        id: String::from("item_c_line_b"),
        item_id: String::from("item_c"),
        store_id: String::from("store_a"),
        batch: Some(String::from("item_c_batch_b")),
        available_number_of_packs: 6,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 1,
        expiry_date: None,
    };

    vec![mock_item_c_line_a, mock_item_c_line_b]
}

pub fn mock_stock_lines() -> Vec<StockLineRow> {
    let mut mock_stock_lines: Vec<StockLineRow> = Vec::new();

    mock_stock_lines.extend(mock_item_a_lines());
    mock_stock_lines.extend(mock_item_b_lines());
    mock_stock_lines.extend(mock_item_c_lines());

    mock_stock_lines
}
