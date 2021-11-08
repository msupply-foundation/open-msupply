use chrono::{DateTime, NaiveDateTime, Utc};

pub fn naive_date_time_to_utc(datatime: NaiveDateTime) -> DateTime<Utc> {
    DateTime::<Utc>::from_utc(datatime, Utc)
}
