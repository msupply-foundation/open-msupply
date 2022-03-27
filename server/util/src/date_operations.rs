use chrono::{Datelike, Duration, NaiveDate, NaiveDateTime, Utc};

pub fn date_now_with_offset(off_set: Duration, is_addition: bool) -> NaiveDate {
    date_with_offset(&date_now(), off_set, is_addition)
}

pub fn date_with_offset(date: &NaiveDate, off_set: Duration, is_addition: bool) -> NaiveDate {
    if is_addition {
        date.checked_add_signed(off_set)
    } else {
        date.checked_sub_signed(off_set)
    }
    .unwrap_or(date.clone())
}

pub fn date_with_days_offset(date: &NaiveDate, days_offset: u32, is_addition: bool) -> NaiveDate {
    let off_set = Duration::days(days_offset as i64);
    date_with_offset(date, off_set, is_addition)
}

pub fn date_now() -> NaiveDate {
    Utc::now().naive_local().date()
}

pub fn datetime_with_offset(
    date: &NaiveDateTime,
    off_set: Duration,
    is_addition: bool,
) -> NaiveDateTime {
    if is_addition {
        date.checked_add_signed(off_set)
    } else {
        date.checked_sub_signed(off_set)
    }
    .unwrap_or(date.clone())
}

pub fn datetime_with_days_offset(
    date: &NaiveDateTime,
    days_offset: u32,
    is_addition: bool,
) -> NaiveDateTime {
    let off_set = Duration::days(days_offset as i64);
    datetime_with_offset(date, off_set, is_addition)
}

/// ```
/// # use chrono::NaiveDate;
/// # use util::*;
///
/// assert_eq!(
///     date_with_months_offset(&NaiveDate::from_ymd(2021, 02, 04), -1),
///     NaiveDate::from_ymd(2021, 01, 01)
/// );
/// assert_eq!(
///     date_with_months_offset(&NaiveDate::from_ymd(2021, 02, 04), 1),
///     NaiveDate::from_ymd(2021, 03, 01)
/// );
/// assert_eq!(
///     date_with_months_offset(&NaiveDate::from_ymd(2021, 02, 04), -2),
///     NaiveDate::from_ymd(2020, 12, 01)
/// );
/// assert_eq!(
///     date_with_months_offset(&NaiveDate::from_ymd(2021, 02, 04), -2),
///     NaiveDate::from_ymd(2020, 12, 01)
/// );
/// assert_eq!(
///     date_with_months_offset(&NaiveDate::from_ymd(2021, 02, 04), -24),
///     NaiveDate::from_ymd(2019, 02, 01)
/// );
/// assert_eq!(
///     date_with_months_offset(&NaiveDate::from_ymd(2021, 02, 04), 24),
///     NaiveDate::from_ymd(2023, 02, 01)
/// );
/// ```
///
pub fn date_with_months_offset(date: &NaiveDate, months_off_set: i32) -> NaiveDate {
    let total_months = date.month0() + date.year() as u32 * 12;
    let new_total_months = total_months as i32 + months_off_set;

    let new_months = new_total_months as u32 % 12 + 1;
    let new_year = (new_total_months as f64 / 12.0).floor() as i32;
    NaiveDate::from_ymd(new_year, new_months, 1)
}

/// ```
/// # use chrono::NaiveDate;
/// # use util::*;
///
/// assert_eq!(
///     last_day_of_the_month(&NaiveDate::from_ymd(2020, 02, 04)),
///     NaiveDate::from_ymd(2020, 02, 29)
/// );
/// assert_eq!(
///     last_day_of_the_month(&NaiveDate::from_ymd(2021, 02, 04)),
///     NaiveDate::from_ymd(2021, 02, 28)
/// );
/// assert_eq!(
///     last_day_of_the_month(&NaiveDate::from_ymd(2021, 12, 04)),
///     NaiveDate::from_ymd(2021, 12, 31)
/// );
/// ```
///
pub fn last_day_of_the_month(date: &NaiveDate) -> NaiveDate {
    date_with_months_offset(date, 1).pred()
}

pub fn first_day_of_the_month(date: &NaiveDate) -> NaiveDate {
    NaiveDate::from_ymd(date.year(), date.month(), 1)
}
