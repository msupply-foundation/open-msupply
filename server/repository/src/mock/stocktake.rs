use chrono::NaiveDate;
use util::inline_init;

use crate::db_diesel::StocktakeRow;

pub fn mock_stocktake_a() -> StocktakeRow {
    inline_init(|r: &mut StocktakeRow| {
        r.id = "stocktake_a".to_string();
        r.store_id = "store_a".to_string();
        r.stocktake_number = 9;
        r.created_datetime = NaiveDate::from_ymd(2021, 12, 14).and_hms_milli(12, 30, 0, 0);
    })
}

pub fn mock_stocktake_b() -> StocktakeRow {
    inline_init(|r: &mut StocktakeRow| {
        r.id = "stocktake_b".to_string();
        r.store_id = "store_b".to_string();
        r.stocktake_number = 10;
        r.comment = Some("stocktake_comment_b".to_string());
        r.description = Some("stocktake_description_b".to_string());
        r.created_datetime = NaiveDate::from_ymd(2021, 12, 14).and_hms_milli(22, 15, 0, 0);
    })
}

pub fn mock_stocktake_no_line_a() -> StocktakeRow {
    inline_init(|r: &mut StocktakeRow| {
        r.id = "no_line_a".to_string();
        r.store_id = "store_a".to_string();
        r.stocktake_number = 10;
        r.comment = Some("stocktake_no_line_comment_a".to_string());
        r.description = Some("stocktake_no_line_description_a".to_string());
        r.created_datetime = NaiveDate::from_ymd(2022, 2, 9).and_hms_milli(11, 15, 0, 0);
    })
}

pub fn mock_stocktake_no_line_b() -> StocktakeRow {
    inline_init(|r: &mut StocktakeRow| {
        r.id = "no_line_b".to_string();
        r.store_id = "store_a".to_string();
        r.stocktake_number = 10;
        r.comment = Some("stocktake_no_line_comment_b".to_string());
        r.description = Some("stocktake_no_line_description_b".to_string());
        r.created_datetime = NaiveDate::from_ymd(2022, 2, 10).and_hms_milli(12, 15, 0, 0);
    })
}

pub fn mock_stocktake_data() -> Vec<StocktakeRow> {
    vec![
        mock_stocktake_a(),
        mock_stocktake_b(),
        mock_stocktake_no_line_a(),
        mock_stocktake_no_line_b(),
    ]
}
