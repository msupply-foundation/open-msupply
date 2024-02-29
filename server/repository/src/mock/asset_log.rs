use chrono::NaiveDate;

use crate::assets::asset_log_row::AssetLogRow;

pub fn mock_asset_log_a() -> AssetLogRow {
    AssetLogRow {
        id: String::from("log_a"),
        asset_id: String::from("asset_a_id"),
        status: None,
        log_datetime: NaiveDate::from_ymd_opt(2022, 4, 12)
            .unwrap()
            .and_hms_opt(11, 11, 11)
            .unwrap(),
    }
}

pub fn mock_asset_log_b() -> AssetLogRow {
    AssetLogRow {
        id: String::from("log_b"),
        asset_id: String::from("asset_a_id"),
        status: None,
        log_datetime: NaiveDate::from_ymd_opt(2022, 5, 12)
            .unwrap()
            .and_hms_opt(11, 11, 11)
            .unwrap(),
    }
}

pub fn mock_asset_log_c() -> AssetLogRow {
    AssetLogRow {
        id: String::from("log_c"),
        asset_id: String::from("asset_a_id"),
        status: Some(String::from("active")),
        log_datetime: NaiveDate::from_ymd_opt(2021, 6, 12)
            .unwrap()
            .and_hms_opt(11, 11, 11)
            .unwrap(),
    }
}

pub fn mock_asset_logs() -> Vec<AssetLogRow> {
    vec![mock_asset_log_a(), mock_asset_log_b(), mock_asset_log_c()]
}
