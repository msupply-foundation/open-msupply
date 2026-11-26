use std::str::FromStr;

use chrono::{DateTime, FixedOffset, Local, NaiveDateTime};
pub use chrono_tz::Tz;

pub fn offset_to_timezone(timezone_offset: &Option<i32>) -> Option<FixedOffset> {
    match timezone_offset {
        None => Some(*Local::now().offset()),
        Some(offset) => FixedOffset::east_opt(offset * 60 * 60),
    }
}

/// The timezone a report is generated in: the one the request named, or UTC when it named none,
/// or one chrono-tz doesn't know. UTC rather than the server's OS timezone, so a server never
/// needs one set up.
pub fn report_timezone(requested: Option<&str>) -> Tz {
    requested
        .and_then(|name| Tz::from_str(name).ok())
        .unwrap_or(Tz::UTC)
}

/// The calendar date an instant falls on in `timezone`.
///
/// The instant is in the form the database stores it, UTC with no zone written
/// (`2026-01-05 23:30:00`, with or without fractional seconds), or with a `T` or an offset.
/// `None` for anything else - a calendar date (`2026-01-05`) included: it is already a day, and
/// is never converted.
pub fn instant_to_calendar_date(value: &str, timezone: Tz) -> Option<String> {
    let value = value.trim();
    let utc = DateTime::parse_from_rfc3339(value)
        .map(|datetime| datetime.naive_utc())
        .or_else(|_| NaiveDateTime::parse_from_str(value, "%Y-%m-%d %H:%M:%S%.f"))
        .or_else(|_| NaiveDateTime::parse_from_str(value, "%Y-%m-%dT%H:%M:%S%.f"))
        .ok()?;

    Some(
        utc.and_utc()
            .with_timezone(&timezone)
            .date_naive()
            .format("%Y-%m-%d")
            .to_string(),
    )
}

#[cfg(test)]
mod test {
    use super::*;

    #[test]
    fn report_timezone_falls_back_to_utc() {
        assert_eq!(
            report_timezone(Some("Pacific/Auckland")),
            Tz::Pacific__Auckland
        );
        assert_eq!(report_timezone(Some("Not/AZone")), Tz::UTC);
        assert_eq!(report_timezone(None), Tz::UTC);
    }

    #[test]
    fn instant_to_calendar_date_is_the_day_in_the_timezone() {
        let auckland = Tz::Pacific__Auckland;
        let los_angeles = Tz::America__Los_Angeles;

        // 23:30 UTC is the next morning in Auckland and the same afternoon in Los Angeles
        assert_eq!(
            instant_to_calendar_date("2026-01-05 23:30:00", auckland).as_deref(),
            Some("2026-01-06")
        );
        assert_eq!(
            instant_to_calendar_date("2026-01-05 23:30:00.123456", los_angeles).as_deref(),
            Some("2026-01-05")
        );
        assert_eq!(
            instant_to_calendar_date("2026-01-05T23:30:00", auckland).as_deref(),
            Some("2026-01-06")
        );
        assert_eq!(
            instant_to_calendar_date("2026-01-05T23:30:00+00:00", auckland).as_deref(),
            Some("2026-01-06")
        );
        // 02:00 UTC is still the previous evening in Los Angeles
        assert_eq!(
            instant_to_calendar_date("2026-01-06 02:00:00", los_angeles).as_deref(),
            Some("2026-01-05")
        );

        // Daylight saving: Auckland is +13 in January, +12 in July
        assert_eq!(
            instant_to_calendar_date("2026-07-05 11:30:00", auckland).as_deref(),
            Some("2026-07-05")
        );
        assert_eq!(
            instant_to_calendar_date("2026-07-05 12:30:00", auckland).as_deref(),
            Some("2026-07-06")
        );

        // A calendar date is not an instant
        assert_eq!(instant_to_calendar_date("2026-01-05", los_angeles), None);
        assert_eq!(instant_to_calendar_date("not a date", auckland), None);
    }
}
