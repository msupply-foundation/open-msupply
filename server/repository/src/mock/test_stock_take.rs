use chrono::NaiveDate;

use crate::schema::{StockTakeLineRow, StockTakeRow, StockTakeStatus};

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

pub fn mock_stock_take_finalized() -> StockTakeRow {
    StockTakeRow {
        id: "mock_stock_take_finalized".to_string(),
        store_id: "store_a".to_string(),
        comment: None,
        description: None,
        status: StockTakeStatus::Finalized,
        created_datetime: NaiveDate::from_ymd(2021, 12, 14).and_hms_milli(12, 30, 0, 0),
        finalised_datetime: Some(NaiveDate::from_ymd(2021, 12, 20).and_hms_milli(10, 15, 10, 0)),
        inventory_additions_id: None,
        inventory_reductions_id: None,
    }
}

pub fn mock_stock_take_finalized_without_lines() -> StockTakeRow {
    StockTakeRow {
        id: "mock_stock_take_finalized_no_lines".to_string(),
        store_id: "store_a".to_string(),
        comment: None,
        description: None,
        status: StockTakeStatus::Finalized,
        created_datetime: NaiveDate::from_ymd(2021, 12, 15).and_hms_milli(12, 30, 0, 0),
        finalised_datetime: Some(NaiveDate::from_ymd(2021, 12, 21).and_hms_milli(10, 15, 10, 0)),
        inventory_additions_id: None,
        inventory_reductions_id: None,
    }
}

pub fn mock_stock_take_line_finalized() -> StockTakeLineRow {
    StockTakeLineRow {
        id: "stock_take_line_finalized".to_string(),
        stock_take_id: mock_stock_take_finalized().id,
        stock_line_id: "item_a_line_a".to_string(),
        location_id: None,
        batch: None,
        comment: None,
        cost_price_pack: 0.0,
        sell_price_pack: 0.0,
        snapshot_number_of_packs: 11,
        counted_number_of_packs: 11,
    }
}

pub fn test_stock_take_data() -> MockData {
    let mut data: MockData = Default::default();
    data.stock_takes = vec![
        mock_stock_take_without_lines(),
        mock_stock_take_finalized(),
        mock_stock_take_finalized_without_lines(),
    ];
    data.stock_take_lines = vec![mock_stock_take_line_finalized()];
    data
}
