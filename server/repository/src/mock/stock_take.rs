use chrono::NaiveDate;

use crate::schema::{StockTakeRow, StockTakeStatus};

pub fn mock_stock_take_a() -> StockTakeRow {
    StockTakeRow {
        id: "stock_take_a".to_string(),
        store_id: "store_a".to_string(),
        comment: None,
        description: None,
        status: StockTakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2021, 12, 14).and_hms_milli(12, 30, 0, 0),
        finalised_datetime: None,
        inventory_additions_id: None,
        inventory_reductions_id: None,
    }
}

pub fn mock_stock_take_b() -> StockTakeRow {
    StockTakeRow {
        id: "stock_take_b".to_string(),
        store_id: "store_b".to_string(),
        comment: Some("stock_take_comment_b".to_string()),
        description: Some("stock_take_description_b".to_string()),
        status: StockTakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2021, 12, 14).and_hms_milli(22, 15, 0, 0),
        finalised_datetime: None,
        inventory_additions_id: None,
        inventory_reductions_id: None,
    }
}

pub fn mock_stock_take_data() -> Vec<StockTakeRow> {
    vec![mock_stock_take_a(), mock_stock_take_b()]
}
