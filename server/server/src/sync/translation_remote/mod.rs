use chrono::{Datelike, Duration, NaiveDate, NaiveDateTime, NaiveTime, Timelike};
use repository::schema::ChangelogTableName;
use serde::{Deserialize, Deserializer};

mod invoice;
mod invoice_line;
mod name_store_join;
mod number;
mod stock_line;
mod stocktake;
mod stocktake_line;

pub mod pull;
pub mod push;

#[cfg(test)]
pub mod test_data;

pub const TRANSLATION_RECORD_NUMBER: &'static str = "number";
/// stock line
pub const TRANSLATION_RECORD_ITEM_LINE: &'static str = "item_line";
pub const TRANSLATION_RECORD_NAME_STORE_JOIN: &'static str = "name_store_join";
pub const TRANSLATION_RECORD_TRANSACT: &'static str = "transact";
pub const TRANSLATION_RECORD_TRANS_LINE: &'static str = "trans_line";
pub const TRANSLATION_RECORD_STOCKTAKE: &'static str = "Stock_take";
pub const TRANSLATION_RECORD_STOCKTAKE_LINE: &'static str = "Stock_take_lines";

/// Returns a list of records that can be translated. The list is topologically sorted, i.e. items
/// at the beginning of the list don't rely on later items to be translated first.
pub const REMOTE_TRANSLATION_RECORDS: &[&str] = &[
    TRANSLATION_RECORD_NUMBER,
    TRANSLATION_RECORD_ITEM_LINE,
    TRANSLATION_RECORD_NAME_STORE_JOIN,
    TRANSLATION_RECORD_TRANSACT,
    TRANSLATION_RECORD_TRANS_LINE,
    TRANSLATION_RECORD_STOCKTAKE,
    TRANSLATION_RECORD_STOCKTAKE_LINE,
];

pub fn table_name_to_central(table: &ChangelogTableName) -> &'static str {
    match table {
        ChangelogTableName::Number => TRANSLATION_RECORD_NUMBER,
        ChangelogTableName::StockLine => TRANSLATION_RECORD_ITEM_LINE,
        ChangelogTableName::NameStoreJoin => TRANSLATION_RECORD_NAME_STORE_JOIN,
        ChangelogTableName::Invoice => TRANSLATION_RECORD_TRANSACT,
        ChangelogTableName::InvoiceLine => TRANSLATION_RECORD_TRANS_LINE,
        ChangelogTableName::Stocktake => TRANSLATION_RECORD_STOCKTAKE,
        ChangelogTableName::StocktakeLine => TRANSLATION_RECORD_STOCKTAKE_LINE,
        ChangelogTableName::Requisition => todo!(),
        ChangelogTableName::RequisitionLine => todo!(),
    }
}

pub fn empty_str_as_option<'de, D: Deserializer<'de>>(d: D) -> Result<Option<String>, D::Error> {
    let s: Option<String> = Option::deserialize(d)?;
    Ok(s.filter(|s| !s.is_empty()))
}

pub fn zero_date_as_option<'de, D: Deserializer<'de>>(d: D) -> Result<Option<NaiveDate>, D::Error> {
    let s: Option<String> = Option::deserialize(d)?;
    Ok(s.filter(|s| s != "0000-00-00")
        .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok()))
}

pub fn date_and_time_to_datatime(date: NaiveDate, seconds: i64) -> NaiveDateTime {
    NaiveDateTime::new(
        date,
        NaiveTime::from_hms(0, 0, 0) + Duration::seconds(seconds),
    )
}

pub fn date_from_date_time(date_time: &NaiveDateTime) -> NaiveDate {
    NaiveDate::from_ymd(date_time.year(), date_time.month(), date_time.day())
}

/// returns the time part in seconds
pub fn time_sec_from_date_time(date_time: &NaiveDateTime) -> i64 {
    let time = date_time.time();
    let seconds = 60 * 60 * time.hour() + 60 * time.minute() + time.second();
    seconds as i64
}
