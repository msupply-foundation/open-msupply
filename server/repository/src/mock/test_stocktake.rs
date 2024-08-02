use chrono::NaiveDate;
use util::inline_init;

use crate::{StockLineRow, StocktakeLineRow, StocktakeRow, StocktakeStatus};

use super::{mock_item_a, mock_stock_line_a, mock_stock_line_b, MockData};

pub fn mock_stocktake_without_lines() -> StocktakeRow {
    inline_init(|r: &mut StocktakeRow| {
        r.id = "stocktake_without_lines".to_string();
        r.store_id = "store_a".to_string();
        r.stocktake_number = 1;
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 12, 14)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap();
    })
}

pub fn mock_stocktake_finalised() -> StocktakeRow {
    inline_init(|r: &mut StocktakeRow| {
        r.id = "mock_stocktake_finalised".to_string();
        r.store_id = "store_a".to_string();
        r.stocktake_number = 2;
        r.status = StocktakeStatus::Finalised;
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 12, 14)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap();
        r.finalised_datetime = Some(
            NaiveDate::from_ymd_opt(2021, 12, 20)
                .unwrap()
                .and_hms_milli_opt(10, 15, 10, 0)
                .unwrap(),
        );
    })
}

pub fn mock_stocktake_finalised_without_lines() -> StocktakeRow {
    inline_init(|r: &mut StocktakeRow| {
        r.id = "mock_stocktake_finalised_no_lines".to_string();
        r.store_id = "store_a".to_string();
        r.stocktake_number = 3;
        r.status = StocktakeStatus::Finalised;
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 12, 15)
            .unwrap()
            .and_hms_milli_opt(12, 30, 0, 0)
            .unwrap();
        r.finalised_datetime = Some(
            NaiveDate::from_ymd_opt(2021, 12, 21)
                .unwrap()
                .and_hms_milli_opt(10, 15, 10, 0)
                .unwrap(),
        );
    })
}

pub fn mock_stocktake_line_finalised() -> StocktakeLineRow {
    let stock_line = mock_stock_line_a();
    inline_init(|r: &mut StocktakeLineRow| {
        r.id = "stocktake_line_finalised".to_string();
        r.stocktake_id = mock_stocktake_finalised().id;
        r.stock_line_id = Some(stock_line.id);
        r.snapshot_number_of_packs = 11.0;
        r.counted_number_of_packs = Some(11.0);
        r.item_link_id = stock_line.item_link_id;
    })
}

// locked

pub fn mock_locked_stocktake() -> StocktakeRow {
    inline_init(|r: &mut StocktakeRow| {
        r.id = "locked_stocktake".to_string();
        r.store_id = "store_a".to_string();
        r.status = StocktakeStatus::New;
        r.is_locked = true;
    })
}

pub fn mock_locked_stocktake_line() -> StocktakeLineRow {
    let stock_line = mock_stock_line_a();
    inline_init(|r: &mut StocktakeLineRow| {
        r.id = "locked stocktake_line_row".to_string();
        r.stocktake_id = mock_locked_stocktake().id;
        r.stock_line_id = Some(stock_line.id);
        r.item_link_id = stock_line.item_link_id;
    })
}

// stock surplus

pub fn mock_stocktake_stock_surplus() -> StocktakeRow {
    inline_init(|r: &mut StocktakeRow| {
        r.id = "mock_stocktake_stock_surplus".to_string();
        r.store_id = "store_a".to_string();
        r.stocktake_number = 4;
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 12, 22)
            .unwrap()
            .and_hms_milli_opt(12, 31, 0, 0)
            .unwrap();
    })
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
        supplier_link_id: Some(String::from("name_store_c")),
        barcode_id: None,
    }
}

pub fn mock_stocktake_line_stock_surplus() -> StocktakeLineRow {
    let stock_line = mock_stock_line_b();
    inline_init(|r: &mut StocktakeLineRow| {
        r.id = "mock_stocktake_line_stock_surplus".to_string();
        r.stocktake_id = mock_stocktake_stock_surplus().id;
        r.stock_line_id = Some(mock_stock_line_stocktake_surplus().id);
        r.snapshot_number_of_packs = stock_line.total_number_of_packs;
        r.counted_number_of_packs = Some(stock_line.total_number_of_packs + 10.0);
        r.item_link_id = stock_line.item_link_id;
    })
}

// stock deficit

pub fn mock_stocktake_stock_deficit() -> StocktakeRow {
    inline_init(|r: &mut StocktakeRow| {
        r.id = "mock_stocktake_stock_deficit".to_string();
        r.store_id = "store_a".to_string();
        r.stocktake_number = 1;
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 12, 22)
            .unwrap()
            .and_hms_milli_opt(12, 31, 0, 0)
            .unwrap();
    })
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
        supplier_link_id: Some(String::from("name_store_c")),
        barcode_id: None,
    }
}

pub fn mock_stocktake_line_stock_deficit() -> StocktakeLineRow {
    let stock_line = mock_stock_line_b();
    inline_init(|r: &mut StocktakeLineRow| {
        r.id = "mock_stocktake_line_stock_deficit".to_string();
        r.stocktake_id = mock_stocktake_stock_deficit().id;
        r.stock_line_id = Some(mock_stock_line_stocktake_deficit().id);
        r.snapshot_number_of_packs = stock_line.total_number_of_packs;
        r.counted_number_of_packs = Some(stock_line.total_number_of_packs - 10.0);
        r.item_link_id = mock_stock_line_stocktake_deficit().item_link_id;
    })
}

// stocktake without lines

pub fn mock_stocktake_no_lines() -> StocktakeRow {
    inline_init(|r: &mut StocktakeRow| {
        r.id = "mock_stocktake_no_lines".to_string();
        r.store_id = "store_a".to_string();
        r.stocktake_number = 5;
        r.created_datetime = NaiveDate::from_ymd_opt(2022, 1, 6)
            .unwrap()
            .and_hms_milli_opt(15, 31, 0, 0)
            .unwrap();
    })
}

// success: no count change should not generate shipment line

pub fn mock_stocktake_no_count_change() -> StocktakeRow {
    inline_init(|r: &mut StocktakeRow| {
        r.id = "mock_stocktake_no_count_change".to_string();
        r.store_id = "store_a".to_string();
        r.stocktake_number = 8;
        r.created_datetime = NaiveDate::from_ymd_opt(2022, 1, 6)
            .unwrap()
            .and_hms_milli_opt(16, 31, 0, 0)
            .unwrap();
    })
}

pub fn mock_stocktake_line_no_count_change() -> StocktakeLineRow {
    let stock_line = mock_stock_line_b();
    inline_init(|r: &mut StocktakeLineRow| {
        r.id = "mock_stocktake_line_no_count_change".to_string();
        r.stocktake_id = mock_stocktake_no_count_change().id;
        r.stock_line_id = Some(mock_stock_line_b().id);
        r.snapshot_number_of_packs = stock_line.total_number_of_packs;
        r.counted_number_of_packs = Some(stock_line.total_number_of_packs);
        r.item_link_id = stock_line.item_link_id;
    })
}

// stocktake full edit

pub fn mock_stocktake_full_edit() -> StocktakeRow {
    inline_init(|r: &mut StocktakeRow| {
        r.id = "mock_stocktake_full_edit".to_string();
        r.store_id = "store_a".to_string();
        r.stocktake_number = 6;
        r.comment = Some("comment_0".to_string());
        r.description = Some("description_0".to_string());
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 12, 14)
            .unwrap()
            .and_hms_milli_opt(12, 32, 0, 0)
            .unwrap();
    })
}

// stocktake with new stock line

pub fn mock_stocktake_new_stock_line() -> StocktakeRow {
    inline_init(|r: &mut StocktakeRow| {
        r.id = "mock_stocktake_new_stock_line".to_string();
        r.store_id = "store_a".to_string();
        r.stocktake_number = 7;
        r.created_datetime = NaiveDate::from_ymd_opt(2021, 12, 14)
            .unwrap()
            .and_hms_milli_opt(12, 33, 0, 0)
            .unwrap();
    })
}
pub fn mock_stocktake_line_new_stock_line() -> StocktakeLineRow {
    inline_init(|r: &mut StocktakeLineRow| {
        r.id = "mock_stocktake_line_new_stock_line".to_string();
        r.stocktake_id = mock_stocktake_new_stock_line().id;
        r.counted_number_of_packs = Some(55.0);
        r.item_link_id = mock_item_a().id;
        r.expiry_date = Some(NaiveDate::from_ymd_opt(2022, 12, 14).unwrap());
        r.batch = Some("batch".to_string());
        r.pack_size = Some(10.0);
        r.cost_price_per_pack = Some(11.0);
        r.sell_price_per_pack = Some(12.0);
        r.note = Some("note".to_string());
    })
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
