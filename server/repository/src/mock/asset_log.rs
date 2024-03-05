use chrono::NaiveDate;

use crate::assets::asset_log_row::AssetLogRow;

pub fn mock_asset_log_a() -> AssetLogRow {
    AssetLogRow {
        id: "log_a".to_string(),
        asset_id: String::from("asset_b"),
        user_id: String::from("user_account_a"),
        status: None,
        comment: None,
        r#type: None,
        reason: None,
        log_datetime: NaiveDate::from_ymd_opt(2022, 4, 12)
            .unwrap()
            .and_hms_opt(11, 11, 11)
            .unwrap(),
    }
}

pub fn mock_asset_log_b() -> AssetLogRow {
    AssetLogRow {
        id: String::from("log_b"),
        asset_id: String::from("asset_b"),
        user_id: String::from("user_account_a"),
        status: None,
        comment: None,
        r#type: None,
        reason: None,
        log_datetime: NaiveDate::from_ymd_opt(2022, 5, 12)
            .unwrap()
            .and_hms_opt(11, 11, 11)
            .unwrap(),
    }
}

pub fn mock_asset_log_c() -> AssetLogRow {
    AssetLogRow {
        id: String::from("log_c"),
        asset_id: String::from("asset_b"),
        user_id: String::from("user_account_a"),
        status: Some(String::from("active")),
        comment: None,
        r#type: None,
        reason: None,
        log_datetime: NaiveDate::from_ymd_opt(2021, 6, 12)
            .unwrap()
            .and_hms_opt(11, 11, 11)
            .unwrap(),
    }
}

pub fn mock_asset_logs() -> Vec<AssetLogRow> {
    vec![mock_asset_log_a(), mock_asset_log_b(), mock_asset_log_c()]
    // vec![mock_asset_log_a()]
}
