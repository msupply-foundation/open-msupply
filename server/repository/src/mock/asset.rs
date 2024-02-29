use chrono::NaiveDate;

use crate::assets::asset_row::AssetRow;

pub fn mock_asset_a() -> AssetRow {
    AssetRow {
        id: String::from("asset_a_id"),
        store_id: None,
        name: String::from("asset_a_id"),
        code: String::from("asset_a_id"),
        serial_number: Some(String::from("asset_a_id")),
        asset_category_id: None,
        asset_type_id: None,
        catalogue_item_id: None,
        installation_date: Some(
            NaiveDate::from_ymd_opt(2020, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
                .into(),
        ),
        replacement_date: None,
        deleted_datetime: None,
        created_datetime: NaiveDate::from_ymd_opt(2020, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        modified_datetime: NaiveDate::from_ymd_opt(2020, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
    }
}

pub fn mock_assets() -> Vec<AssetRow> {
    vec![mock_asset_a()]
}
