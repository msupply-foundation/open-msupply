use chrono::NaiveDate;

use crate::schema::{StockLineRow, StockTakeLineRow, StockTakeRow, StockTakeStatus};

use super::{mock_stock_line_b, MockData};

pub fn mock_stock_take_without_lines() -> StockTakeRow {
    StockTakeRow {
        id: "stock_take_without_lines".to_string(),
        store_id: "store_a".to_string(),
        comment: None,
        description: None,
        status: StockTakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2021, 12, 14).and_hms_milli(12, 30, 0, 0),
        finalised_datetime: None,
        inventory_adjustment_id: None,
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
        inventory_adjustment_id: None,
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
        inventory_adjustment_id: None,
    }
}

pub fn mock_stock_take_line_finalized() -> StockTakeLineRow {
    StockTakeLineRow {
        id: "stock_take_line_finalized".to_string(),
        stock_take_id: mock_stock_take_finalized().id,
        stock_line_id: Some("item_a_line_a".to_string()),
        location_id: None,
        comment: None,
        snapshot_number_of_packs: 11,
        counted_number_of_packs: Some(11),
        item_id: None,
        expiry_date: None,
        batch: None,
        pack_size: None,
        cost_price_per_pack: None,
        sell_price_per_pack: None,
        note: None,
    }
}

// stock surplus

pub fn mock_stock_take_stock_surplus() -> StockTakeRow {
    StockTakeRow {
        id: "mock_stock_take_stock_surplus".to_string(),
        store_id: "store_a".to_string(),
        comment: None,
        description: None,
        status: StockTakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2021, 12, 22).and_hms_milli(12, 31, 0, 0),
        finalised_datetime: None,
        inventory_adjustment_id: None,
    }
}

pub fn mock_stock_line_stock_take_surplus() -> StockLineRow {
    StockLineRow {
        id: String::from("mock_stock_line_stock_take_surplus"),
        item_id: String::from("item_a"),
        location_id: None,
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_batch_b")),
        available_number_of_packs: 20,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 30,
        expiry_date: None,
        on_hold: false,
        note: None,
    }
}

pub fn mock_stock_take_line_stock_surplus() -> StockTakeLineRow {
    let stock_line = mock_stock_line_b();
    StockTakeLineRow {
        id: "mock_stock_take_line_stock_surplus".to_string(),
        stock_take_id: mock_stock_take_stock_surplus().id,
        stock_line_id: Some(mock_stock_line_stock_take_surplus().id),
        location_id: None,
        comment: None,
        snapshot_number_of_packs: stock_line.total_number_of_packs,
        counted_number_of_packs: Some(stock_line.total_number_of_packs + 10),
        item_id: None,
        expiry_date: None,
        batch: None,
        pack_size: None,
        cost_price_per_pack: None,
        sell_price_per_pack: None,
        note: None,
    }
}

// stock deficit

pub fn mock_stock_take_stock_deficit() -> StockTakeRow {
    StockTakeRow {
        id: "mock_stock_take_stock_deficit".to_string(),
        store_id: "store_a".to_string(),
        comment: None,
        description: None,
        status: StockTakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2021, 12, 22).and_hms_milli(12, 31, 0, 0),
        finalised_datetime: None,
        inventory_adjustment_id: None,
    }
}

pub fn mock_stock_line_stock_take_deficit() -> StockLineRow {
    StockLineRow {
        id: String::from("mock_stock_line_stock_take_deficit"),
        item_id: String::from("item_a"),
        location_id: None,
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_batch_b")),
        available_number_of_packs: 20,
        pack_size: 1,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 30,
        expiry_date: None,
        on_hold: false,
        note: None,
    }
}

pub fn mock_stock_take_line_stock_deficit() -> StockTakeLineRow {
    let stock_line = mock_stock_line_b();
    StockTakeLineRow {
        id: "mock_stock_take_line_stock_deficit".to_string(),
        stock_take_id: mock_stock_take_stock_deficit().id,
        stock_line_id: Some(mock_stock_line_stock_take_deficit().id),
        location_id: None,
        comment: None,
        snapshot_number_of_packs: stock_line.total_number_of_packs,
        counted_number_of_packs: Some(stock_line.total_number_of_packs - 10),
        item_id: None,
        expiry_date: None,
        batch: None,
        pack_size: None,
        cost_price_per_pack: None,
        sell_price_per_pack: None,
        note: None,
    }
}

pub fn test_stock_take_data() -> MockData {
    let mut data: MockData = Default::default();
    data.stock_takes = vec![
        mock_stock_take_without_lines(),
        mock_stock_take_finalized(),
        mock_stock_take_finalized_without_lines(),
        mock_stock_take_stock_surplus(),
        mock_stock_take_stock_deficit(),
    ];
    data.stock_take_lines = vec![
        mock_stock_take_line_finalized(),
        mock_stock_take_line_stock_surplus(),
        mock_stock_take_line_stock_deficit(),
    ];
    data.stock_lines = vec![
        mock_stock_line_stock_take_surplus(),
        mock_stock_line_stock_take_deficit(),
    ];
    data
}
