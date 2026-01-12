use chrono::NaiveDate;

use crate::{StockLineRow, StocktakeLineRow, StocktakeRow, StocktakeStatus};

use super::{mock_donor_a, mock_item_a, mock_stock_line_a, mock_stock_line_b, MockData};

pub fn mock_stocktake_without_lines() -> StocktakeRow {
    StocktakeRow {
        id: "stocktake_without_lines".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 1,
        created_datetime: NaiveDate::from_ymd_opt(2021, 12, 14)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_stocktake_finalised() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_finalised".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 2,
        status: StocktakeStatus::Finalised,
        created_datetime: NaiveDate::from_ymd_opt(2021, 12, 14)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap(),
        finalised_datetime: Some(
            NaiveDate::from_ymd_opt(2021, 12, 20)
                .unwrap()
                .and_hms_milli_opt(10, 15, 10, 0)
                .unwrap(),
        ),
        ..Default::default()
    }
}

pub fn mock_stocktake_finalised_without_lines() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_finalised_no_lines".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 3,
        status: StocktakeStatus::Finalised,
        created_datetime: NaiveDate::from_ymd_opt(2021, 12, 15)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap(),
        finalised_datetime: Some(
            NaiveDate::from_ymd_opt(2021, 12, 21)
                .unwrap()
                .and_hms_milli_opt(11, 15, 10, 0)
                .unwrap(),
        ),
        ..Default::default()
    }
}

pub fn mock_stocktake_line_finalised() -> StocktakeLineRow {
    let stock_line = mock_stock_line_a();
    StocktakeLineRow {
        id: "stocktake_line_finalised".to_string(),
        stocktake_id: mock_stocktake_finalised().id,
        stock_line_id: Some(stock_line.id),
        snapshot_number_of_packs: 11.0,
        counted_number_of_packs: Some(11.0),
        item_link_id: stock_line.item_link_id,
        ..Default::default()
    }
}

// locked

pub fn mock_locked_stocktake() -> StocktakeRow {
    StocktakeRow {
        id: "locked_stocktake".to_string(),
        store_id: "store_a".to_string(),
        status: StocktakeStatus::New,
        is_locked: true,
        ..Default::default()
    }
}

pub fn mock_locked_stocktake_line() -> StocktakeLineRow {
    let stock_line = mock_stock_line_a();
    StocktakeLineRow {
        id: "locked stocktake_line_row".to_string(),
        stocktake_id: mock_locked_stocktake().id,
        stock_line_id: Some(stock_line.id),
        item_link_id: stock_line.item_link_id,
        ..Default::default()
    }
}

// stock surplus
pub fn mock_stocktake_stock_surplus() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_stock_surplus".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 4,
        created_datetime: NaiveDate::from_ymd_opt(2021, 12, 22)
            .unwrap()
            .and_hms_milli_opt(12, 31, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_stock_line_stocktake_surplus() -> StockLineRow {
    StockLineRow {
        id: String::from("mock_stock_line_stocktake_surplus"),
        item_link_id: String::from("item_a"),
        location_id: None,
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_batch_b")),
        available_number_of_packs: 20.0,
        pack_size: 1.0,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 30.0,
        expiry_date: None,
        on_hold: false,
        note: None,
        supplier_id: Some(String::from("name_store_c")),
        ..Default::default()
    }
}

pub fn mock_stocktake_line_stock_surplus() -> StocktakeLineRow {
    let stock_line = mock_stock_line_b();
    StocktakeLineRow {
        id: "mock_stocktake_line_stock_surplus".to_string(),
        stocktake_id: mock_stocktake_stock_surplus().id,
        stock_line_id: Some(mock_stock_line_stocktake_surplus().id),
        snapshot_number_of_packs: stock_line.total_number_of_packs,
        counted_number_of_packs: Some(stock_line.total_number_of_packs + 10.0),
        item_link_id: stock_line.item_link_id,
        ..Default::default()
    }
}

// stock deficit

pub fn mock_stocktake_stock_deficit() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_stock_deficit".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 1,
        created_datetime: NaiveDate::from_ymd_opt(2021, 12, 22)
            .unwrap()
            .and_hms_milli_opt(12, 31, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_stock_line_stocktake_deficit() -> StockLineRow {
    StockLineRow {
        id: String::from("mock_stock_line_stocktake_deficit"),
        item_link_id: String::from("item_a"),
        location_id: None,
        store_id: String::from("store_a"),
        batch: Some(String::from("item_a_batch_b")),
        available_number_of_packs: 20.0,
        pack_size: 1.0,
        cost_price_per_pack: 0.0,
        sell_price_per_pack: 0.0,
        total_number_of_packs: 30.0,
        expiry_date: None,
        on_hold: false,
        note: None,
        supplier_id: Some(String::from("name_store_c")),
        ..Default::default()
    }
}

pub fn mock_stocktake_line_stock_deficit() -> StocktakeLineRow {
    let stock_line = mock_stock_line_b();
    StocktakeLineRow {
        id: "mock_stocktake_line_stock_deficit".to_string(),
        stocktake_id: mock_stocktake_stock_deficit().id,
        stock_line_id: Some(mock_stock_line_stocktake_deficit().id),
        snapshot_number_of_packs: stock_line.total_number_of_packs,
        counted_number_of_packs: Some(stock_line.total_number_of_packs - 10.0),
        item_link_id: mock_stock_line_stocktake_deficit().item_link_id,
        ..Default::default()
    }
}

// stocktake without lines

// stocktake without lines

pub fn mock_stocktake_no_lines() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_no_lines".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 5,
        created_datetime: NaiveDate::from_ymd_opt(2022, 1, 6)
            .unwrap()
            .and_hms_milli_opt(15, 31, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

// success: no count change should not generate shipment line
pub fn mock_stocktake_no_count_change() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_no_count_change".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 8,
        created_datetime: NaiveDate::from_ymd_opt(2022, 1, 6)
            .unwrap()
            .and_hms_milli_opt(16, 31, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

pub fn mock_stocktake_line_no_count_change() -> StocktakeLineRow {
    let stock_line = mock_stock_line_b();
    StocktakeLineRow {
        id: "mock_stocktake_line_no_count_change".to_string(),
        stocktake_id: mock_stocktake_no_count_change().id,
        stock_line_id: Some(mock_stock_line_b().id),
        snapshot_number_of_packs: stock_line.total_number_of_packs,
        counted_number_of_packs: Some(stock_line.total_number_of_packs),
        item_link_id: stock_line.item_link_id,
        ..Default::default()
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
        created_datetime: NaiveDate::from_ymd_opt(2021, 12, 14)
            .unwrap()
            .and_hms_milli_opt(12, 32, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}

// stocktake with new stock line

pub fn mock_stocktake_new_stock_line() -> StocktakeRow {
    StocktakeRow {
        id: "mock_stocktake_new_stock_line".to_string(),
        store_id: "store_a".to_string(),
        stocktake_number: 7,
        created_datetime: NaiveDate::from_ymd_opt(2021, 12, 14)
            .unwrap()
            .and_hms_milli_opt(12, 33, 0, 0)
            .unwrap(),
        ..Default::default()
    }
}
pub fn mock_stocktake_line_new_stock_line() -> StocktakeLineRow {
    StocktakeLineRow {
        id: "mock_stocktake_line_new_stock_line".to_string(),
        stocktake_id: mock_stocktake_new_stock_line().id,
        counted_number_of_packs: Some(55.0),
        item_link_id: mock_item_a().id,
        expiry_date: Some(NaiveDate::from_ymd_opt(2022, 12, 14).unwrap()),
        batch: Some("batch".to_string()),
        pack_size: Some(10.0),
        cost_price_per_pack: Some(11.0),
        sell_price_per_pack: Some(12.0),
        note: Some("note".to_string()),
        donor_link_id: Some(mock_donor_a().id),
        ..Default::default()
    }
}

pub fn test_stocktake_data() -> MockData {
    MockData {
        stocktakes: vec![
            mock_stocktake_without_lines(),
            mock_stocktake_finalised(),
            mock_stocktake_finalised_without_lines(),
            mock_stocktake_stock_surplus(),
            mock_stocktake_stock_deficit(),
            mock_stocktake_no_lines(),
            mock_stocktake_no_count_change(),
            mock_stocktake_full_edit(),
            mock_stocktake_new_stock_line(),
            mock_locked_stocktake(),
        ],
        stocktake_lines: vec![
            mock_stocktake_line_finalised(),
            mock_stocktake_line_stock_surplus(),
            mock_stocktake_line_stock_deficit(),
            mock_stocktake_line_no_count_change(),
            mock_stocktake_line_new_stock_line(),
            mock_locked_stocktake_line(),
        ],
        stock_lines: vec![
            mock_stock_line_stocktake_surplus(),
            mock_stock_line_stocktake_deficit(),
        ],
        ..Default::default()
    }
}
