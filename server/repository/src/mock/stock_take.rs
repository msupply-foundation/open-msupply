use chrono::NaiveDate;

use crate::schema::{StockTakeRow, StockTakeStatus};

pub fn mock_stock_take_a() -> StockTakeRow {
    StockTakeRow {
        id: "stock_take_a".to_string(),
        store_id: "store_a".to_string(),
        stock_take_number: 9,
        comment: None,
        description: None,
        status: StockTakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2021, 12, 14).and_hms_milli(12, 30, 0, 0),
        finalised_datetime: None,
        inventory_adjustment_id: None,
    }
}

pub fn mock_stock_take_b() -> StockTakeRow {
    StockTakeRow {
        id: "stock_take_b".to_string(),
        store_id: "store_b".to_string(),
        stock_take_number: 10,
        comment: Some("stock_take_comment_b".to_string()),
        description: Some("stock_take_description_b".to_string()),
        status: StockTakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2021, 12, 14).and_hms_milli(22, 15, 0, 0),
        finalised_datetime: None,
        inventory_adjustment_id: None,
    }
}

pub fn mock_stock_take_no_line_a() -> StockTakeRow {
    StockTakeRow {
        id: "no_line_a".to_string(),
        store_id: "store_a".to_string(),
        stock_take_number: 10,
        comment: Some("stock_take_no_line_comment_a".to_string()),
        description: Some("stock_take_no_line_description_a".to_string()),
        status: StockTakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2022, 2, 9).and_hms_milli(11, 15, 0, 0),
        finalised_datetime: None,
        inventory_adjustment_id: None,
    }
}

pub fn mock_stock_take_no_line_b() -> StockTakeRow {
    StockTakeRow {
        id: "no_line_b".to_string(),
        store_id: "store_a".to_string(),
        stock_take_number: 10,
        comment: Some("stock_take_no_line_comment_b".to_string()),
        description: Some("stock_take_no_line_description_b".to_string()),
        status: StockTakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2022, 2, 10).and_hms_milli(12, 15, 0, 0),
        finalised_datetime: None,
        inventory_adjustment_id: None,
    }
}

pub fn mock_stock_take_data() -> Vec<StockTakeRow> {
    vec![
        mock_stock_take_a(),
        mock_stock_take_b(),
        mock_stock_take_no_line_a(),
        mock_stock_take_no_line_b(),
    ]
}
