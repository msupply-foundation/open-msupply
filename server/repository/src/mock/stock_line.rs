use chrono::NaiveDate;
use util::inline_init;

use crate::StockLineRow;

use super::mock_vaccine_item_a;

pub fn mock_stock_line_a() -> StockLineRow {
    inline_init(|r: &mut StockLineRow| {
        r.id = String::from("item_a_line_a");
        r.item_link_id = String::from("item_a");
        r.store_id = String::from("store_a");
        r.available_number_of_packs = 30.0;
        r.pack_size = 1.0;
        r.total_number_of_packs = 40.0;
        r.supplier_link_id = Some(String::from("name_store_b"));
    })
}

pub fn mock_stock_line_b() -> StockLineRow {
    inline_init(|r: &mut StockLineRow| {
        r.id = String::from("item_a_line_b");
        r.item_link_id = String::from("item_a");
        r.store_id = String::from("store_a");
        r.batch = Some(String::from("item_a_batch_b"));
        r.available_number_of_packs = 20.0;
        r.pack_size = 1.0;
        r.total_number_of_packs = 30.0;
        r.supplier_link_id = Some(String::from("name_store_b"));
    })
}

pub fn mock_item_a_lines() -> Vec<StockLineRow> {
    let mock_item_a_line_a: StockLineRow = mock_stock_line_a();

    let mock_item_a_line_b: StockLineRow = mock_stock_line_b();

    vec![mock_item_a_line_a, mock_item_a_line_b]
}

pub fn mock_item_b_stock_line_a() -> StockLineRow {
    inline_init(|r: &mut StockLineRow| {
        r.id = String::from("item_b_line_a");
        r.item_link_id = String::from("item_b");
        r.store_id = String::from("store_b");
        r.batch = Some(String::from("item_b_batch_a"));
        r.available_number_of_packs = 3.0;
        r.pack_size = 1.0;
        r.total_number_of_packs = 30.0;
        r.supplier_link_id = Some(String::from("name_store_b"));
    })
}

pub fn mock_item_b_lines() -> Vec<StockLineRow> {
    let mock_item_b_line_a: StockLineRow = mock_item_b_stock_line_a();

    let mock_item_b_line_b: StockLineRow = inline_init(|r: &mut StockLineRow| {
        r.id = String::from("item_b_line_b");
        r.item_link_id = String::from("item_b");
        r.store_id = String::from("store_b");
        r.batch = Some(String::from("item_b_batch_b"));
        r.available_number_of_packs = 4.0;
        r.pack_size = 1.0;
        r.total_number_of_packs = 25.0;
        r.supplier_link_id = Some(String::from("name_store_b"));
    });

    vec![mock_item_b_line_a, mock_item_b_line_b]
}

pub fn mock_item_c_lines() -> Vec<StockLineRow> {
    let mock_item_c_line_a: StockLineRow = inline_init(|r: &mut StockLineRow| {
        r.id = String::from("item_c_line_a");
        r.item_link_id = String::from("item_c");
        r.store_id = String::from("store_c");
        r.batch = Some(String::from("item_c_batch_a"));
        r.available_number_of_packs = 5.0;
        r.pack_size = 1.0;
        r.cost_price_per_pack = 12.0;
        r.sell_price_per_pack = 15.0;
        r.total_number_of_packs = 1.0;
        r.note = Some("stock line note".to_string());
        r.supplier_link_id = Some(String::from("name_store_b"));
    });

    let mock_item_c_line_b: StockLineRow = inline_init(|r: &mut StockLineRow| {
        r.id = String::from("item_c_line_b");
        r.item_link_id = String::from("item_c");
        r.store_id = String::from("store_c");
        r.batch = Some(String::from("item_c_batch_b"));
        r.available_number_of_packs = 6.0;
        r.pack_size = 1.0;
        r.total_number_of_packs = 1.0;
        r.supplier_link_id = Some(String::from("name_store_b"));
    });

    vec![mock_item_c_line_a, mock_item_c_line_b]
}

pub fn mock_stock_line_si_d() -> Vec<StockLineRow> {
    let mock_stock_line_si_d_siline_a: StockLineRow = inline_init(|r: &mut StockLineRow| {
        r.id = String::from("stock_line_si_d_siline_a");
        r.item_link_id = String::from("item_a");
        r.store_id = String::from("store_a");
        r.batch = Some(String::from("item_a_si_d_siline_a"));
        r.available_number_of_packs = 7.0;
        r.pack_size = 1.0;
        r.cost_price_per_pack = 2.0;
        r.sell_price_per_pack = 18.0;
        r.total_number_of_packs = 7.0;
        r.supplier_link_id = Some(String::from("name_store_b"));
    });

    let mock_stock_line_si_d_siline_b: StockLineRow = inline_init(|r: &mut StockLineRow| {
        r.id = String::from("stock_line_si_d_siline_b");
        r.item_link_id = String::from("item_b");
        r.store_id = String::from("store_a");
        r.batch = Some(String::from("item_b_si_c_siline_d"));
        r.available_number_of_packs = 2.0;
        r.pack_size = 3.0;
        r.cost_price_per_pack = 45.0;
        r.sell_price_per_pack = 34.0;
        r.total_number_of_packs = 2.0;
        r.expiry_date = Some(NaiveDate::from_ymd_opt(2020, 8, 11).unwrap());
        r.supplier_link_id = Some(String::from("name_store_b"));
    });

    vec![mock_stock_line_si_d_siline_a, mock_stock_line_si_d_siline_b]
}

pub fn mock_stock_line_ci_c() -> Vec<StockLineRow> {
    let mock_stock_line_ci_c_siline_a: StockLineRow = inline_init(|r: &mut StockLineRow| {
        r.id = String::from("stock_line_ci_c_siline_a");
        r.item_link_id = String::from("item_a");
        r.store_id = String::from("store_a");
        r.batch = Some(String::from("item_a_ci_c_siline_a"));
        r.available_number_of_packs = 5.0;
        r.pack_size = 3.0;
        r.cost_price_per_pack = 8.0;
        r.sell_price_per_pack = 9.0;
        r.total_number_of_packs = 8.0;
        r.expiry_date = Some(NaiveDate::from_ymd_opt(2020, 1, 4).unwrap());
        r.supplier_link_id = Some(String::from("name_store_b"));
    });

    let mock_stock_line_ci_c_siline_b: StockLineRow = inline_init(|r: &mut StockLineRow| {
        r.id = String::from("stock_line_ci_c_siline_b");
        r.item_link_id = String::from("item_b");
        r.store_id = String::from("store_a");
        r.available_number_of_packs = 20.0;
        r.pack_size = 7.0;
        r.cost_price_per_pack = 54.0;
        r.sell_price_per_pack = 34.0;
        r.total_number_of_packs = 21.0;
        r.expiry_date = Some(NaiveDate::from_ymd_opt(2020, 3, 23).unwrap());
        r.supplier_link_id = Some(String::from("name_store_b"));
    });

    vec![mock_stock_line_ci_c_siline_a, mock_stock_line_ci_c_siline_b]
}

pub fn mock_stock_line_ci_d() -> Vec<StockLineRow> {
    let mock_stock_line_ci_d_siline_a: StockLineRow = inline_init(|r: &mut StockLineRow| {
        r.id = String::from("stock_line_ci_d_siline_a");
        r.item_link_id = String::from("item_a");
        r.store_id = String::from("store_a");
        r.batch = Some(String::from("item_a_ci_d_siline_a"));
        r.available_number_of_packs = 10.0;
        r.pack_size = 1.0;
        r.cost_price_per_pack = 10.0;
        r.sell_price_per_pack = 11.0;
        r.total_number_of_packs = 10.0;
        r.expiry_date = Some(NaiveDate::from_ymd_opt(2020, 1, 4).unwrap());
        r.supplier_link_id = Some(String::from("name_store_b"));
    });

    vec![mock_stock_line_ci_d_siline_a]
}

pub fn mock_item_query_test1() -> Vec<StockLineRow> {
    let mock_item_query_test1: StockLineRow = inline_init(|r: &mut StockLineRow| {
        r.id = "item_query_test1".to_string();
        r.item_link_id = "item_query_test1".to_string();
        r.store_id = "store_a".to_string();
        r.available_number_of_packs = 3.0;
        r.pack_size = 12.0;
        r.cost_price_per_pack = 2.0;
        r.sell_price_per_pack = 11.0;
        r.total_number_of_packs = 3.0;
        r.supplier_link_id = Some(String::from("name_store_b"));
    });

    vec![mock_item_query_test1]
}

pub fn mock_stock_line_on_hold() -> Vec<StockLineRow> {
    let mock_stock_line_on_hold: StockLineRow = inline_init(|r: &mut StockLineRow| {
        r.id = "stock_line_on_hold".to_string();
        r.item_link_id = "item_c".to_string();
        r.store_id = "store_a".to_string();
        r.available_number_of_packs = 100.0;
        r.pack_size = 1.0;
        r.total_number_of_packs = 100.0;
        r.on_hold = true;
        r.supplier_link_id = Some(String::from("name_store_b"));
    });

    vec![mock_stock_line_on_hold]
}

pub fn mock_stock_line_location_is_on_hold() -> Vec<StockLineRow> {
    let mock_stock_line_location_is_on_hold: StockLineRow = inline_init(|r: &mut StockLineRow| {
        r.id = "stock_line_location_is_on_hold".to_string();
        r.item_link_id = "item_c".to_string();
        r.location_id = Some("location_on_hold".to_string());
        r.store_id = "store_a".to_string();
        r.available_number_of_packs = 100.0;
        r.pack_size = 1.0;
        r.total_number_of_packs = 100.0;
        r.supplier_link_id = Some(String::from("name_store_b"));
    });

    vec![mock_stock_line_location_is_on_hold]
}

pub fn mock_stock_line_vaccine_item_a() -> StockLineRow {
    inline_init(|r: &mut StockLineRow| {
        r.id = "vaccine_item_a_line_a".to_string();
        r.item_link_id = mock_vaccine_item_a().id;
        r.store_id = "store_a".to_string();
        r.available_number_of_packs = 5.0;
        r.pack_size = 5.0;
        r.total_number_of_packs = 6.0;
    })
}
pub fn mock_stock_line_b_vaccine_item_a() -> StockLineRow {
    inline_init(|r: &mut StockLineRow| {
        r.id = "vaccine_item_a_line_b".to_string();
        r.item_link_id = mock_vaccine_item_a().id;
        r.store_id = "store_a".to_string();
        r.available_number_of_packs = 10.0;
        r.pack_size = 20.0;
        r.total_number_of_packs = 10.0;
    })
}

pub fn mock_vaccine_stock_lines() -> Vec<StockLineRow> {
    let mock_stock_line_vaccine_item_a = mock_stock_line_vaccine_item_a();
    let mock_stock_line_b_vaccine_item_a = mock_stock_line_b_vaccine_item_a();

    vec![
        mock_stock_line_vaccine_item_a,
        mock_stock_line_b_vaccine_item_a,
    ]
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
    mock_stock_lines
}
