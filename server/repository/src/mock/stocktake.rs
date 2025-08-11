use chrono::NaiveDate;

use crate::StocktakeRow;

pub fn mock_stocktake_a() -> StocktakeRow {
    StocktakeRow {
        id: "stocktake_a".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 9,
        created_datetime: NaiveDate::from_ymd_opt(2021, 12, 14)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap(),
        is_initial_stocktake: false,
        ..Default::default()
    }
}

pub fn mock_stocktake_b() -> StocktakeRow {
    StocktakeRow {
        id: "stocktake_b".to_string(),
        store_id: "store_b".to_string(),
        stocktake_number: 10,
        comment: Some("stocktake_comment_b".to_string()),
        description: Some("stocktake_description_b".to_string()),
        created_datetime: NaiveDate::from_ymd_opt(2021, 12, 14)
            .unwrap()
            .and_hms_milli_opt(22, 15, 0, 0)
            .unwrap(),
        is_initial_stocktake: false,
        ..Default::default()
    }
}

pub fn mock_stocktake_no_line_a() -> StocktakeRow {
    StocktakeRow {
        id: "no_line_a".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 10,
        comment: Some("stocktake_no_line_comment_a".to_string()),
        description: Some("stocktake_no_line_description_a".to_string()),
        created_datetime: NaiveDate::from_ymd_opt(2022, 2, 9)
            .unwrap()
            .and_hms_milli_opt(11, 15, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_stocktake_no_line_b() -> StocktakeRow {
    StocktakeRow {
        id: "no_line_b".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 10,
        comment: Some("stocktake_no_line_comment_b".to_string()),
        description: Some("stocktake_no_line_description_b".to_string()),
        created_datetime: NaiveDate::from_ymd_opt(2022, 2, 10)
            .unwrap()
            .and_hms_milli_opt(12, 15, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_stocktake_data() -> Vec<StocktakeRow> {
    vec![
        mock_stocktake_a(),
        mock_stocktake_b(),
        mock_stocktake_no_line_a(),
        mock_stocktake_no_line_b(),
    ]
}
