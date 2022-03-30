use chrono::{Duration, NaiveDate, Utc};

pub fn date_now_with_offset(off_set: Duration) -> NaiveDate {
    let now = Utc::now().naive_local();
    now.checked_add_signed(off_set).unwrap_or(now).date()
}

pub fn date_now() -> NaiveDate {
    Utc::now().naive_local().date()
}
