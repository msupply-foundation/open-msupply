use chrono::{Datelike, Duration, NaiveDate, NaiveDateTime, NaiveTime};
use serde::{
    de::{value::StrDeserializer, IntoDeserializer},
    Deserialize, Deserializer, Serialize, Serializer,
};
use util::format_error;

pub fn empty_str_as_option_string<'de, D: Deserializer<'de>>(
    d: D,
) -> Result<Option<String>, D::Error> {
    let s: Option<String> = Option::deserialize(d)?;
    Ok(s.filter(|s| !s.is_empty()))
}

pub fn empty_str_as_option<'de, T: Deserialize<'de>, D: Deserializer<'de>>(
    d: D,
) -> Result<Option<T>, D::Error> {
    let s: Option<String> = empty_str_as_option_string(d)?;

    let Some(s) = s else { return Ok(None)};

    let str_d: StrDeserializer<D::Error> = s.as_str().into_deserializer();
    Ok(Some(T::deserialize(str_d)?))
}

pub fn zero_date_as_option<'de, D: Deserializer<'de>>(d: D) -> Result<Option<NaiveDate>, D::Error> {
    let s: Option<String> = Option::deserialize(d)?;
    Ok(s.filter(|s| s != "0000-00-00")
        .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok()))
}

pub fn date_and_time_to_datetime(date: NaiveDate, seconds: i64) -> NaiveDateTime {
    NaiveDateTime::new(
        date,
        NaiveTime::from_hms_opt(0, 0, 0).unwrap() + Duration::seconds(seconds),
    )
}

pub fn date_from_date_time(date_time: &NaiveDateTime) -> NaiveDate {
    NaiveDate::from_ymd_opt(date_time.year(), date_time.month(), date_time.day()).unwrap()
}

/// V5 gives us a NaiveDate but V3 receives a NaiveDateTime
pub fn date_to_isostring<S>(x: &NaiveDate, s: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    x.and_hms_opt(0, 0, 0).unwrap().serialize(s)
}

pub fn date_option_to_isostring<S>(x: &Option<NaiveDate>, s: S) -> Result<S::Ok, S::Error>
where
    S: Serializer,
{
    x.map(|date| date.and_hms_opt(0, 0, 0).unwrap())
        .serialize(s)
}

/// Currently v5 returns times in sec and v3 expects a time string when posting. To make it more
/// consistent v5 behaviour might change in the future. This helper will make it easy to do the
/// change on our side.
pub fn naive_time<'de, D: Deserializer<'de>>(d: D) -> Result<NaiveTime, D::Error> {
    // Ignore gracefully https://github.com/msupply-foundation/open-msupply-internal/issues/37
    let secs = match u32::deserialize(d) {
        Ok(secs) => secs,
        Err(err) => {
            log::warn!("Problem deserialising time: {}", format_error(&err));
            0
        }
    };
    // using the _opt version of the method and on error returning a time of 00:00:00
    // as there have been some invalid time values returned by 4D - unsure of the origin of these
    // if the deserialisation panics then the whole server crashes, so have used the error & default
    Ok(NaiveTime::from_num_seconds_from_midnight_opt(secs, 0)
        .unwrap_or(NaiveTime::from_hms_opt(0, 0, 0).unwrap()))
}
