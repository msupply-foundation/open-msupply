use chrono::{Datelike, Duration, NaiveDate, NaiveDateTime, NaiveTime};
use repository::schema::ChangelogTableName;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

mod invoice;
mod invoice_line;
mod location;
mod name_store_join;
mod number;
mod requisition;
mod requisition_line;
mod stock_line;
mod stocktake;
mod stocktake_line;

pub mod pull;
pub mod push;

#[cfg(test)]
pub mod test_data;

pub const TRANSLATION_RECORD_NUMBER: &'static str = "number";
pub const TRANSLATION_RECORD_LOCATION: &'static str = "Location";
/// stock line
pub const TRANSLATION_RECORD_ITEM_LINE: &'static str = "item_line";
pub const TRANSLATION_RECORD_NAME_STORE_JOIN: &'static str = "name_store_join";
pub const TRANSLATION_RECORD_TRANSACT: &'static str = "transact";
pub const TRANSLATION_RECORD_TRANS_LINE: &'static str = "trans_line";
pub const TRANSLATION_RECORD_STOCKTAKE: &'static str = "Stock_take";
pub const TRANSLATION_RECORD_STOCKTAKE_LINE: &'static str = "Stock_take_lines";
pub const TRANSLATION_RECORD_REQUISITION: &'static str = "requisition";
pub const TRANSLATION_RECORD_REQUISITION_LINE: &'static str = "requisition_line";

/// Returns a list of records that can be translated. The list is topologically sorted, i.e. items
/// at the beginning of the list don't rely on later items to be translated first.
pub const REMOTE_TRANSLATION_RECORDS: &[&str] = &[
    TRANSLATION_RECORD_NUMBER,
    TRANSLATION_RECORD_LOCATION,
    TRANSLATION_RECORD_ITEM_LINE,
    TRANSLATION_RECORD_NAME_STORE_JOIN,
    TRANSLATION_RECORD_TRANSACT,
    TRANSLATION_RECORD_TRANS_LINE,
    TRANSLATION_RECORD_STOCKTAKE,
    TRANSLATION_RECORD_STOCKTAKE_LINE,
    TRANSLATION_RECORD_REQUISITION,
    TRANSLATION_RECORD_REQUISITION_LINE,
];

pub fn table_name_to_central(table: &ChangelogTableName) -> &'static str {
    match table {
        ChangelogTableName::Number => TRANSLATION_RECORD_NUMBER,
        ChangelogTableName::Location => TRANSLATION_RECORD_LOCATION,
        ChangelogTableName::StockLine => TRANSLATION_RECORD_ITEM_LINE,
        ChangelogTableName::NameStoreJoin => TRANSLATION_RECORD_NAME_STORE_JOIN,
        ChangelogTableName::Invoice => TRANSLATION_RECORD_TRANSACT,
        ChangelogTableName::InvoiceLine => TRANSLATION_RECORD_TRANS_LINE,
        ChangelogTableName::Stocktake => TRANSLATION_RECORD_STOCKTAKE,
        ChangelogTableName::StocktakeLine => TRANSLATION_RECORD_STOCKTAKE_LINE,
        ChangelogTableName::Requisition => TRANSLATION_RECORD_REQUISITION,
        ChangelogTableName::RequisitionLine => TRANSLATION_RECORD_REQUISITION_LINE,
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

pub fn empty_date_time_as_option<'de, D: Deserializer<'de>>(
    d: D,
) -> Result<Option<NaiveDateTime>, D::Error> {
    let s: Option<String> = Option::deserialize(d)?;
    Ok(s.filter(|s| s != "")
        .and_then(|s| NaiveDateTime::parse_from_str(&s, "%Y-%m-%dT%H:%M:%S").ok()))
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

/// V5 gives us a NaiveDate but V3 receives a NaiveDateTime
fn date_to_isostring<S>(x: &NaiveDate, s: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    x.and_hms(0, 0, 0).serialize(s)
}

fn date_option_to_isostring<S>(x: &Option<NaiveDate>, s: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    x.map(|date| date.and_hms(0, 0, 0)).serialize(s)
}

/// Currently v5 returns times in sec and v3 expects a time string when posting. To make it more
/// consistent v5 behaviour might change in the future. This helper will make it easy to do the
/// change on our side.
pub fn naive_time<'de, D: Deserializer<'de>>(d: D) -> Result<NaiveTime, D::Error> {
    let secs = u32::deserialize(d)?;
    Ok(NaiveTime::from_num_seconds_from_midnight(secs, 0))
}
