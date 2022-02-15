use chrono::NaiveDate;

use crate::schema::{StockLineRow, StocktakeLineRow, StocktakeRow, StocktakeStatus};

use super::{mock_item_a, mock_stock_line_a, mock_stock_line_b, MockData};

pub fn mock_stocktake_without_lines() -> StocktakeRow {
    StocktakeRow {
        id: "stocktake_without_lines".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 1,
        comment: None,
        description: None,
        status: StocktakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2021, 12, 14).and_hms_milli(12, 30, 0, 0),
        finalised_datetime: None,
        inventory_adjustment_id: None,
    }
}

pub fn mock_stocktake_finalised() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_finalised".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 2,
        comment: None,
        description: None,
        status: StocktakeStatus::Finalised,
        created_datetime: NaiveDate::from_ymd(2021, 12, 14).and_hms_milli(12, 30, 0, 0),
        finalised_datetime: Some(NaiveDate::from_ymd(2021, 12, 20).and_hms_milli(10, 15, 10, 0)),
        inventory_adjustment_id: None,
    }
}

pub fn mock_stocktake_finalised_without_lines() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_finalised_no_lines".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 3,
        comment: None,
        description: None,
        status: StocktakeStatus::Finalised,
        created_datetime: NaiveDate::from_ymd(2021, 12, 15).and_hms_milli(12, 30, 0, 0),
        finalised_datetime: Some(NaiveDate::from_ymd(2021, 12, 21).and_hms_milli(10, 15, 10, 0)),
        inventory_adjustment_id: None,
    }
}

pub fn mock_stocktake_line_finalised() -> StocktakeLineRow {
    let stock_line = mock_stock_line_a();
    StocktakeLineRow {
        id: "stocktake_line_finalised".to_string(),
        stocktake_id: mock_stocktake_finalised().id,
        stock_line_id: Some(stock_line.id),
        location_id: None,
        comment: None,
        snapshot_number_of_packs: 11,
        counted_number_of_packs: Some(11),
        item_id: stock_line.item_id,
        expiry_date: None,
        batch: None,
        pack_size: None,
        cost_price_per_pack: None,
        sell_price_per_pack: None,
        note: None,
    }
}

// stock surplus

pub fn mock_stocktake_stock_surplus() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_stock_surplus".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 4,
        comment: None,
        description: None,
        status: StocktakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2021, 12, 22).and_hms_milli(12, 31, 0, 0),
        finalised_datetime: None,
        inventory_adjustment_id: None,
    }
}

pub fn mock_stock_line_stocktake_surplus() -> StockLineRow {
    StockLineRow {
        id: String::from("mock_stock_line_stocktake_surplus"),
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

pub fn mock_stocktake_line_stock_surplus() -> StocktakeLineRow {
    let stock_line = mock_stock_line_b();
    StocktakeLineRow {
        id: "mock_stocktake_line_stock_surplus".to_string(),
        stocktake_id: mock_stocktake_stock_surplus().id,
        stock_line_id: Some(mock_stock_line_stocktake_surplus().id),
        location_id: None,
        comment: None,
        snapshot_number_of_packs: stock_line.total_number_of_packs,
        counted_number_of_packs: Some(stock_line.total_number_of_packs + 10),
        item_id: stock_line.item_id,
        expiry_date: None,
        batch: None,
        pack_size: None,
        cost_price_per_pack: None,
        sell_price_per_pack: None,
        note: None,
    }
}

// stock deficit

pub fn mock_stocktake_stock_deficit() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_stock_deficit".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 1,
        comment: None,
        description: None,
        status: StocktakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2021, 12, 22).and_hms_milli(12, 31, 0, 0),
        finalised_datetime: None,
        inventory_adjustment_id: None,
    }
}

pub fn mock_stock_line_stocktake_deficit() -> StockLineRow {
    StockLineRow {
        id: String::from("mock_stock_line_stocktake_deficit"),
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

pub fn mock_stocktake_line_stock_deficit() -> StocktakeLineRow {
    let stock_line = mock_stock_line_b();
    StocktakeLineRow {
        id: "mock_stocktake_line_stock_deficit".to_string(),
        stocktake_id: mock_stocktake_stock_deficit().id,
        stock_line_id: Some(mock_stock_line_stocktake_deficit().id),
        location_id: None,
        comment: None,
        snapshot_number_of_packs: stock_line.total_number_of_packs,
        counted_number_of_packs: Some(stock_line.total_number_of_packs - 10),
        item_id: mock_stock_line_stocktake_deficit().item_id,
        expiry_date: None,
        batch: None,
        pack_size: None,
        cost_price_per_pack: None,
        sell_price_per_pack: None,
        note: None,
    }
}

// stocktake without lines

pub fn mock_stocktake_no_lines() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_no_lines".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 5,
        comment: None,
        description: None,
        status: StocktakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2022, 1, 6).and_hms_milli(15, 31, 0, 0),
        finalised_datetime: None,
        inventory_adjustment_id: None,
    }
}

// success: no count change should not generate shipment line

pub fn mock_stocktake_no_count_change() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_no_count_change".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 8,
        comment: None,
        description: None,
        status: StocktakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2022, 1, 6).and_hms_milli(16, 31, 0, 0),
        finalised_datetime: None,
        inventory_adjustment_id: None,
    }
}

pub fn mock_stocktake_line_no_count_change() -> StocktakeLineRow {
    let stock_line = mock_stock_line_b();
    StocktakeLineRow {
        id: "mock_stocktake_line_no_count_change".to_string(),
        stocktake_id: mock_stocktake_no_count_change().id,
        stock_line_id: Some(mock_stock_line_b().id),
        location_id: None,
        comment: None,
        snapshot_number_of_packs: stock_line.total_number_of_packs,
        counted_number_of_packs: Some(stock_line.total_number_of_packs),
        item_id: stock_line.item_id,
        expiry_date: None,
        batch: None,
        pack_size: None,
        cost_price_per_pack: None,
        sell_price_per_pack: None,
        note: None,
    }
}

// stocktake full edit

pub fn mock_stocktake_full_edit() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_full_edit".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 6,
        comment: Some("comment_0".to_string()),
        description: Some("description_0".to_string()),
        status: StocktakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2021, 12, 14).and_hms_milli(12, 32, 0, 0),
        finalised_datetime: None,
        inventory_adjustment_id: None,
    }
}

// stocktake with new stock line

pub fn mock_stocktake_new_stock_line() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_new_stock_line".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 7,
        comment: None,
        description: None,
        status: StocktakeStatus::New,
        created_datetime: NaiveDate::from_ymd(2021, 12, 14).and_hms_milli(12, 33, 0, 0),
        finalised_datetime: None,
        inventory_adjustment_id: None,
    }
}
pub fn mock_stocktake_line_new_stock_line() -> StocktakeLineRow {
    StocktakeLineRow {
        id: "mock_stocktake_line_new_stock_line".to_string(),
        stocktake_id: mock_stocktake_new_stock_line().id,
        stock_line_id: None,
        location_id: None,
        comment: None,
        snapshot_number_of_packs: 0,
        counted_number_of_packs: Some(55),
        item_id: mock_item_a().id,
        expiry_date: Some(NaiveDate::from_ymd(2022, 12, 14)),
        batch: Some("batch".to_string()),
        pack_size: Some(10),
        cost_price_per_pack: Some(11.0),
        sell_price_per_pack: Some(12.0),
        note: Some("note".to_string()),
    }
}

pub fn test_stocktake_data() -> MockData {
    let mut data: MockData = Default::default();
    data.stocktakes = vec![
        mock_stocktake_without_lines(),
        mock_stocktake_finalised(),
        mock_stocktake_finalised_without_lines(),
        mock_stocktake_stock_surplus(),
        mock_stocktake_stock_deficit(),
        mock_stocktake_no_lines(),
        mock_stocktake_no_count_change(),
        mock_stocktake_full_edit(),
        mock_stocktake_new_stock_line(),
    ];
    data.stocktake_lines = vec![
        mock_stocktake_line_finalised(),
        mock_stocktake_line_stock_surplus(),
        mock_stocktake_line_stock_deficit(),
        mock_stocktake_line_no_count_change(),
        mock_stocktake_line_new_stock_line(),
    ];
    data.stock_lines = vec![
        mock_stock_line_stocktake_surplus(),
        mock_stock_line_stocktake_deficit(),
    ];
    data
}
