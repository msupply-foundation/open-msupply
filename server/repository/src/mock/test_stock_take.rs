use chrono::NaiveDate;

use crate::schema::{StockTakeRow, StockTakeStatus};

use super::MockData;

pub fn mock_stock_take_without_lines() -> StockTakeRow {
    StockTakeRow {
        id: "stock_take_without_lines".to_string(),
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

pub fn test_stock_take_data() -> MockData {
    let mut data: MockData = Default::default();
    data.stock_takes = vec![mock_stock_take_without_lines()];
    data
}
