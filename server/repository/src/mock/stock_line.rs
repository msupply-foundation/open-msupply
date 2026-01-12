use chrono::NaiveDate;

use super::mock_vaccine_item_a;
use crate::{
    mock::{mock_item_a, mock_item_restricted_location_type_b, mock_store_c},
    StockLineRow,
};

pub fn mock_stock_line_a() -> StockLineRow {
    StockLineRow {
        id: String::from("item_a_line_a"),
        item_link_id: String::from("item_a"),
        store_id: String::from("store_a"),
        available_number_of_packs: 30.0,
        pack_size: 1.0,
        total_number_of_packs: 40.0,
        supplier_id: Some(String::from("name_store_b")),
        ..Default::default()
    }
}

pub fn mock_stock_line_b() -> StockLineRow {
    StockLineRow {
        id: String::from("item_a_line_b"),
        item_link_id: String::from("item_a"),
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_batch_b")),
        available_number_of_packs: 20.0,
        pack_size: 1.0,
        total_number_of_packs: 30.0,
        supplier_id: Some(String::from("name_store_b")),
        ..Default::default()
    }
}

pub fn mock_item_a_lines() -> Vec<StockLineRow> {
    let mock_item_a_line_a: StockLineRow = mock_stock_line_a();

    let mock_item_a_line_b: StockLineRow = mock_stock_line_b();

    vec![mock_item_a_line_a, mock_item_a_line_b]
}

pub fn mock_item_b_stock_line_a() -> StockLineRow {
    StockLineRow {
        id: String::from("item_b_line_a"),
        item_link_id: String::from("item_b"),
        store_id: String::from("store_b"),
        batch: Some(String::from("item_b_batch_a")),
        available_number_of_packs: 3.0,
        pack_size: 1.0,
        total_number_of_packs: 30.0,
        supplier_id: Some(String::from("name_store_b")),
        ..Default::default()
    }
}

pub fn mock_item_b_lines() -> Vec<StockLineRow> {
    let mock_item_b_line_a: StockLineRow = mock_item_b_stock_line_a();

    let mock_item_b_line_b: StockLineRow = StockLineRow {
        id: String::from("item_b_line_b"),
        item_link_id: String::from("item_b"),
        store_id: String::from("store_b"),
        batch: Some(String::from("item_b_batch_b")),
        available_number_of_packs: 4.0,
        pack_size: 1.0,
        total_number_of_packs: 25.0,
        supplier_id: Some(String::from("name_store_b")),
        ..Default::default()
    };

    vec![mock_item_b_line_a, mock_item_b_line_b]
}

pub fn mock_item_c_lines() -> Vec<StockLineRow> {
    let mock_item_c_line_a: StockLineRow = StockLineRow {
        id: String::from("item_c_line_a"),
        item_link_id: String::from("item_c"),
        store_id: String::from("store_c"),
        batch: Some(String::from("item_c_batch_a")),
        available_number_of_packs: 5.0,
        pack_size: 1.0,
        cost_price_per_pack: 12.0,
        sell_price_per_pack: 15.0,
        total_number_of_packs: 1.0,
        note: Some("stock line note".to_string()),
        supplier_id: Some(String::from("name_store_b")),
        ..Default::default()
    };

    let mock_item_c_line_b: StockLineRow = StockLineRow {
        id: String::from("item_c_line_b"),
        item_link_id: String::from("item_c"),
        store_id: String::from("store_c"),
        batch: Some(String::from("item_c_batch_b")),
        available_number_of_packs: 6.0,
        pack_size: 1.0,
        total_number_of_packs: 1.0,
        supplier_id: Some(String::from("name_store_b")),
        ..Default::default()
    };

    vec![mock_item_c_line_a, mock_item_c_line_b]
}

pub fn mock_stock_line_si_d() -> Vec<StockLineRow> {
    let mock_stock_line_si_d_siline_a: StockLineRow = StockLineRow {
        id: String::from("stock_line_si_d_siline_a"),
        item_link_id: String::from("item_a"),
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_si_d_siline_a")),
        available_number_of_packs: 7.0,
        pack_size: 1.0,
        cost_price_per_pack: 2.0,
        sell_price_per_pack: 18.0,
        total_number_of_packs: 7.0,
        supplier_id: Some(String::from("name_store_b")),
        ..Default::default()
    };

    let mock_stock_line_si_d_siline_b: StockLineRow = StockLineRow {
        id: String::from("stock_line_si_d_siline_b"),
        item_link_id: String::from("item_b"),
        store_id: String::from("store_a"),
        batch: Some(String::from("item_b_si_c_siline_d")),
        available_number_of_packs: 2.0,
        pack_size: 3.0,
        cost_price_per_pack: 45.0,
        sell_price_per_pack: 34.0,
        total_number_of_packs: 2.0,
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 8, 11).unwrap()),
        supplier_id: Some(String::from("name_store_b")),
        ..Default::default()
    };

    vec![mock_stock_line_si_d_siline_a, mock_stock_line_si_d_siline_b]
}

pub fn mock_stock_line_ci_c() -> Vec<StockLineRow> {
    let mock_stock_line_ci_c_siline_a: StockLineRow = StockLineRow {
        id: String::from("stock_line_ci_c_siline_a"),
        item_link_id: String::from("item_a"),
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_ci_c_siline_a")),
        available_number_of_packs: 5.0,
        pack_size: 3.0,
        cost_price_per_pack: 8.0,
        sell_price_per_pack: 9.0,
        total_number_of_packs: 8.0,
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 1, 4).unwrap()),
        supplier_id: Some(String::from("name_store_b")),
        ..Default::default()
    };

    let mock_stock_line_ci_c_siline_b: StockLineRow = StockLineRow {
        id: String::from("stock_line_ci_c_siline_b"),
        item_link_id: String::from("item_b"),
        store_id: String::from("store_a"),
        available_number_of_packs: 20.0,
        pack_size: 7.0,
        cost_price_per_pack: 54.0,
        sell_price_per_pack: 34.0,
        total_number_of_packs: 21.0,
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 3, 23).unwrap()),
        supplier_id: Some(String::from("name_store_b")),
        ..Default::default()
    };

    vec![mock_stock_line_ci_c_siline_a, mock_stock_line_ci_c_siline_b]
}

pub fn mock_stock_line_ci_d() -> Vec<StockLineRow> {
    let mock_stock_line_ci_d_siline_a: StockLineRow = StockLineRow {
        id: String::from("stock_line_ci_d_siline_a"),
        item_link_id: String::from("item_a"),
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_ci_d_siline_a")),
        available_number_of_packs: 10.0,
        pack_size: 1.0,
        cost_price_per_pack: 10.0,
        sell_price_per_pack: 11.0,
        total_number_of_packs: 10.0,
        expiry_date: Some(NaiveDate::from_ymd_opt(2020, 1, 4).unwrap()),
        supplier_id: Some(String::from("name_store_b")),
        ..Default::default()
    };

    vec![mock_stock_line_ci_d_siline_a]
}

pub fn mock_item_query_test1() -> Vec<StockLineRow> {
    let mock_item_query_test1: StockLineRow = StockLineRow {
        id: "item_query_test1".to_string(),
        item_link_id: "item_query_test1".to_string(),
        store_id: "store_a".to_string(),
        available_number_of_packs: 3.0,
        pack_size: 12.0,
        cost_price_per_pack: 2.0,
        sell_price_per_pack: 11.0,
        total_number_of_packs: 3.0,
        supplier_id: Some(String::from("name_store_b")),
        ..Default::default()
    };

    vec![mock_item_query_test1]
}

pub fn mock_stock_line_on_hold() -> Vec<StockLineRow> {
    let mock_stock_line_on_hold: StockLineRow = StockLineRow {
        id: "stock_line_on_hold".to_string(),
        item_link_id: "item_c".to_string(),
        store_id: "store_a".to_string(),
        available_number_of_packs: 100.0,
        pack_size: 1.0,
        total_number_of_packs: 100.0,
        on_hold: true,
        supplier_id: Some(String::from("name_store_b")),
        ..Default::default()
    };

    vec![mock_stock_line_on_hold]
}

pub fn mock_stock_line_location_is_on_hold() -> Vec<StockLineRow> {
    let mock_stock_line_location_is_on_hold: StockLineRow = StockLineRow {
        id: "stock_line_location_is_on_hold".to_string(),
        item_link_id: "item_c".to_string(),
        location_id: Some("location_on_hold".to_string()),
        store_id: "store_a".to_string(),
        available_number_of_packs: 100.0,
        pack_size: 1.0,
        total_number_of_packs: 100.0,
        supplier_id: Some(String::from("name_store_b")),
        ..Default::default()
    };

    vec![mock_stock_line_location_is_on_hold]
}

pub fn mock_stock_line_vaccine_item_a() -> StockLineRow {
    StockLineRow {
        id: "vaccine_item_a_line_a".to_string(),
        item_link_id: mock_vaccine_item_a().id,
        store_id: "store_a".to_string(),
        available_number_of_packs: 5.0,
        pack_size: 5.0,
        total_number_of_packs: 6.0,
        ..Default::default()
    }
}
pub fn mock_stock_line_b_vaccine_item_a() -> StockLineRow {
    StockLineRow {
        id: "vaccine_item_a_line_b".to_string(),
        item_link_id: mock_vaccine_item_a().id,
        store_id: "store_a".to_string(),
        available_number_of_packs: 10.0,
        pack_size: 20.0,
        total_number_of_packs: 10.0,
        ..Default::default()
    }
}

pub fn stock_line_with_volume() -> StockLineRow {
    StockLineRow {
        id: "stock_line_with_volume".to_string(),
        store_id: mock_store_c().id.clone(),
        item_link_id: mock_item_a().id,
        pack_size: 10.0,
        available_number_of_packs: 20.0,
        total_number_of_packs: 20.0,
        batch: Some("batch".to_string()),
        volume_per_pack: 50.0,
        total_volume: 1000.0,
        ..Default::default()
    }
}

pub fn mock_vaccine_stock_lines() -> Vec<StockLineRow> {
    let mock_stock_line_vaccine_item_a = mock_stock_line_vaccine_item_a();
    let mock_stock_line_b_vaccine_item_a = mock_stock_line_b_vaccine_item_a();

    vec![
        mock_stock_line_vaccine_item_a,
        mock_stock_line_b_vaccine_item_a,
    ]
}

pub fn mock_stock_line_restricted_location_type_b() -> StockLineRow {
    StockLineRow {
        id: "stock_line_restricted_location_type".to_string(),
        item_link_id: mock_item_restricted_location_type_b().id,
        store_id: "store_a".to_string(),
        available_number_of_packs: 100.0,
        pack_size: 1.0,
        total_number_of_packs: 100.0,
        ..Default::default()
    }
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
    mock_stock_lines.extend(mock_vaccine_stock_lines());
    mock_stock_lines.push(stock_line_with_volume());
    mock_stock_lines.extend(vec![mock_stock_line_restricted_location_type_b()]);
    mock_stock_lines
}
