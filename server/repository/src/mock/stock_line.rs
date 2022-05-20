use chrono::NaiveDate;

use crate::StockLineRow;

pub fn mock_stock_line_a() -> StockLineRow {
    StockLineRow {
        id: String::from("item_a_line_a"),
        item_id: String::from("item_a"),
        location_id: None,
        store_id: String::from("store_a"),
        batch: None,
        available_number_of_packs: 30,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 40,
        expiry_date: None,
        on_hold: false,
        note: None,
    }
}

pub fn mock_stock_line_b() -> StockLineRow {
    StockLineRow {
        id: String::from("item_a_line_b"),
        item_id: String::from("item_a"),
        location_id: None,
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_batch_b")),
        available_number_of_packs: 20,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 30,
        expiry_date: None,
        on_hold: false,
        note: None,
    }
}

pub fn mock_item_a_lines() -> Vec<StockLineRow> {
    let mock_item_a_line_a: StockLineRow = mock_stock_line_a();

    let mock_item_a_line_b: StockLineRow = mock_stock_line_b();

    vec![mock_item_a_line_a, mock_item_a_line_b]
}

pub fn mock_item_b_lines() -> Vec<StockLineRow> {
    let mock_item_b_line_a: StockLineRow = StockLineRow {
        id: String::from("item_b_line_a"),
        item_id: String::from("item_b"),
        location_id: None,
        store_id: String::from("store_b"),
        batch: Some(String::from("item_b_batch_a")),
        available_number_of_packs: 3,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 30,
        expiry_date: None,
        on_hold: false,
        note: None,
    };

    let mock_item_b_line_b: StockLineRow = StockLineRow {
        id: String::from("item_b_line_b"),
        item_id: String::from("item_b"),
        location_id: None,
        store_id: String::from("store_b"),
        batch: Some(String::from("item_b_batch_b")),
        available_number_of_packs: 4,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 25,
        expiry_date: None,
        on_hold: false,
        note: None,
    };

    vec![mock_item_b_line_a, mock_item_b_line_b]
}

pub fn mock_item_c_lines() -> Vec<StockLineRow> {
    let mock_item_c_line_a: StockLineRow = StockLineRow {
        id: String::from("item_c_line_a"),
        item_id: String::from("item_c"),
        location_id: None,
        store_id: String::from("store_c"),
        batch: Some(String::from("item_c_batch_a")),
        available_number_of_packs: 5,
        pack_size: 1,
        cost_price_per_pack: 12.0,
        sell_price_per_pack: 15.0,
        total_number_of_packs: 1,
        expiry_date: None,
        on_hold: false,
        note: Some("stock line note".to_owned()),
    };

    let mock_item_c_line_b: StockLineRow = StockLineRow {
        id: String::from("item_c_line_b"),
        item_id: String::from("item_c"),
        location_id: None,
        store_id: String::from("store_c"),
        batch: Some(String::from("item_c_batch_b")),
        available_number_of_packs: 6,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 1,
        expiry_date: None,
        on_hold: false,
        note: None,
    };

    vec![mock_item_c_line_a, mock_item_c_line_b]
}

pub fn mock_stock_line_si_d() -> Vec<StockLineRow> {
    let mock_stock_line_si_d_siline_a: StockLineRow = StockLineRow {
        id: String::from("stock_line_si_d_siline_a"),
        item_id: String::from("item_a"),
        location_id: None,
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_si_d_siline_a")),
        available_number_of_packs: 7,
        pack_size: 1,
        cost_price_per_pack: 2.0,
        sell_price_per_pack: 18.0,
        total_number_of_packs: 7,
        expiry_date: None,
        on_hold: false,
        note: None,
    };

    let mock_stock_line_si_d_siline_b: StockLineRow = StockLineRow {
        id: String::from("stock_line_si_d_siline_b"),
        item_id: String::from("item_b"),
        location_id: None,
        store_id: String::from("store_a"),
        batch: Some(String::from("item_b_si_c_siline_d")),
        available_number_of_packs: 2,
        pack_size: 3,
        cost_price_per_pack: 45.0,
        sell_price_per_pack: 34.0,
        total_number_of_packs: 2,
        expiry_date: Some(NaiveDate::from_ymd(2020, 8, 11)),
        on_hold: false,
        note: None,
    };

    vec![mock_stock_line_si_d_siline_a, mock_stock_line_si_d_siline_b]
}

pub fn mock_stock_line_ci_c() -> Vec<StockLineRow> {
    let mock_stock_line_ci_c_siline_a: StockLineRow = StockLineRow {
        id: String::from("stock_line_ci_c_siline_a"),
        item_id: String::from("item_a"),
        location_id: None,
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_ci_c_siline_a")),
        available_number_of_packs: 5,
        pack_size: 3,
        cost_price_per_pack: 8.0,
        sell_price_per_pack: 9.0,
        total_number_of_packs: 8,
        expiry_date: Some(NaiveDate::from_ymd(2020, 1, 4)),
        on_hold: false,
        note: None,
    };

    let mock_stock_line_ci_c_siline_b: StockLineRow = StockLineRow {
        id: String::from("stock_line_ci_c_siline_b"),
        item_id: String::from("item_b"),
        location_id: None,
        store_id: String::from("store_a"),
        batch: None,
        available_number_of_packs: 20,
        pack_size: 7,
        cost_price_per_pack: 54.0,
        sell_price_per_pack: 34.0,
        total_number_of_packs: 21,
        expiry_date: Some(NaiveDate::from_ymd(2020, 3, 23)),
        on_hold: false,
        note: None,
    };

    vec![mock_stock_line_ci_c_siline_a, mock_stock_line_ci_c_siline_b]
}

pub fn mock_stock_line_ci_d() -> Vec<StockLineRow> {
    let mock_stock_line_ci_d_siline_a: StockLineRow = StockLineRow {
        id: String::from("stock_line_ci_d_siline_a"),
        item_id: String::from("item_a"),
        location_id: None,
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_ci_d_siline_a")),
        available_number_of_packs: 10,
        pack_size: 1,
        cost_price_per_pack: 10.0,
        sell_price_per_pack: 11.0,
        total_number_of_packs: 10,
        expiry_date: Some(NaiveDate::from_ymd(2020, 1, 4)),
        on_hold: false,
        note: None,
    };

    vec![mock_stock_line_ci_d_siline_a]
}

pub fn mock_item_query_test1() -> Vec<StockLineRow> {
    let mock_item_query_test1: StockLineRow = StockLineRow {
        id: "item_query_test1".to_owned(),
        item_id: "item_query_test1".to_owned(),
        location_id: None,
        store_id: "store_a".to_owned(),
        batch: None,
        available_number_of_packs: 3,
        pack_size: 12,
        cost_price_per_pack: 2.0,
        sell_price_per_pack: 11.0,
        total_number_of_packs: 3,
        expiry_date: None,
        on_hold: false,
        note: None,
    };

    vec![mock_item_query_test1]
}

pub fn mock_stock_line_on_hold() -> Vec<StockLineRow> {
    let mock_stock_line_on_hold: StockLineRow = StockLineRow {
        id: "stock_line_on_hold".to_owned(),
        item_id: "item_c".to_owned(),
        location_id: None,
        store_id: "store_a".to_owned(),
        batch: None,
        available_number_of_packs: 100,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 100,
        expiry_date: None,
        on_hold: true,
        note: None,
    };

    vec![mock_stock_line_on_hold]
}

pub fn mock_stock_line_location_is_on_hold() -> Vec<StockLineRow> {
    let mock_stock_line_location_is_on_hold: StockLineRow = StockLineRow {
        id: "stock_line_location_is_on_hold".to_owned(),
        item_id: "item_c".to_owned(),
        location_id: Some("location_on_hold".to_owned()),
        store_id: "store_a".to_owned(),
        batch: None,
        available_number_of_packs: 100,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 100,
        expiry_date: None,
        on_hold: false,
        note: None,
    };

    vec![mock_stock_line_location_is_on_hold]
}

pub fn mock_stock_lines() -> Vec<StockLineRow> {
    let mut mock_stock_lines: Vec<StockLineRow> = Vec::new();

    mock_stock_lines.extend(mock_item_a_lines());
    mock_stock_lines.extend(mock_item_b_lines());
    mock_stock_lines.extend(mock_item_c_lines());
    mock_stock_lines.extend(mock_stock_line_si_d());
    mock_stock_lines.extend(mock_stock_line_ci_c());
    mock_stock_lines.extend(mock_stock_line_ci_d());
    mock_stock_lines.extend(mock_item_query_test1());
    mock_stock_lines.extend(mock_stock_line_on_hold());
    mock_stock_lines.extend(mock_stock_line_location_is_on_hold());
    mock_stock_lines
}
