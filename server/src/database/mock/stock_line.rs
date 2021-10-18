use chrono::NaiveDate;

use crate::database::schema::StockLineRow;

pub fn mock_item_a_lines() -> Vec<StockLineRow> {
    let mock_item_a_line_a: StockLineRow = StockLineRow {
        id: String::from("item_a_line_a"),
        item_id: String::from("item_a"),
        store_id: String::from("store_a"),
        batch: None,
        available_number_of_packs: 1,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 1,
        expiry_date: None,
    };

    let mock_item_a_line_b: StockLineRow = StockLineRow {
        id: String::from("item_a_line_b"),
        item_id: String::from("item_a"),
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_batch_b")),
        available_number_of_packs: 2,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 1,
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
        total_number_of_packs: 1,
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
        total_number_of_packs: 1,
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

pub fn mock_stock_line_si_d() -> Vec<StockLineRow> {
    let mock_stock_line_si_d_siline_a: StockLineRow = StockLineRow {
        id: String::from("stock_line_si_d_siline_a"),
        item_id: String::from("item_a"),
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_si_d_siline_a")),
        available_number_of_packs: 7,
        pack_size: 1,
        cost_price_per_pack: 2.0,
        sell_price_per_pack: 18.0,
        total_number_of_packs: 7,
        expiry_date: None,
    };

    let mock_stock_line_si_d_siline_b: StockLineRow = StockLineRow {
        id: String::from("stock_line_si_d_siline_b"),
        item_id: String::from("item_b"),
        store_id: String::from("store_a"),
        batch: Some(String::from("item_b_si_c_siline_d")),
        available_number_of_packs: 2,
        pack_size: 3,
        cost_price_per_pack: 45.0,
        sell_price_per_pack: 34.0,
        total_number_of_packs: 2,
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 11)),
    };

    vec![mock_stock_line_si_d_siline_a, mock_stock_line_si_d_siline_b]
}

pub fn mock_stock_line_ci_c() -> Vec<StockLineRow> {
    let mock_stock_line_ci_c_siline_a: StockLineRow = StockLineRow {
        id: String::from("stock_line_ci_c_siline_a"),
        item_id: String::from("item_a"),
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_ci_c_siline_a")),
        available_number_of_packs: 5,
        pack_size: 3,
        cost_price_per_pack: 8.0,
        sell_price_per_pack: 9.0,
        total_number_of_packs: 8,
        expiry_date: Some(NaiveDate::from_ymd(2020, 1, 4)),
    };

    let mock_stock_line_ci_c_siline_b: StockLineRow = StockLineRow {
        id: String::from("stock_line_ci_c_siline_b"),
        item_id: String::from("item_b"),
        store_id: String::from("store_a"),
        batch: None,
        available_number_of_packs: 20,
        pack_size: 7,
        cost_price_per_pack: 54.0,
        sell_price_per_pack: 34.0,
        total_number_of_packs: 21,
        expiry_date: Some(NaiveDate::from_ymd(2020, 3, 23)),
    };

    vec![mock_stock_line_ci_c_siline_a, mock_stock_line_ci_c_siline_b]
}

pub fn mock_stock_lines() -> Vec<StockLineRow> {
    let mut mock_stock_lines: Vec<StockLineRow> = Vec::new();

    mock_stock_lines.extend(mock_item_a_lines());
    mock_stock_lines.extend(mock_item_b_lines());
    mock_stock_lines.extend(mock_item_c_lines());
    mock_stock_lines.extend(mock_stock_line_si_d());
    mock_stock_lines.extend(mock_stock_line_ci_c());

    mock_stock_lines
}
