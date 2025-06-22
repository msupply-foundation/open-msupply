use chrono::{Datelike, Duration, NaiveDate, NaiveDateTime, NaiveTime};
use serde::{
    de::{value::StrDeserializer, Error, IntoDeserializer},
    Deserialize, Deserializer, Serialize, Serializer,
};
use serde_yaml::Value;
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

    let Some(s) = s else { return Ok(None) };

    let str_d: StrDeserializer<D::Error> = s.as_str().into_deserializer();
    Ok(Some(T::deserialize(str_d)?))
}

pub fn zero_date_as_option<'de, D: Deserializer<'de>>(d: D) -> Result<Option<NaiveDate>, D::Error> {
    let s: Option<String> = Option::deserialize(d)?;
    Ok(s.filter(|s| s != "0000-00-00")
        .and_then(|s| NaiveDate::parse_from_str(&s, "%Y-%m-%d").ok()))
}

pub fn object_fields_as_option<'de, T: Deserialize<'de>, D: Deserializer<'de>>(
    d: D,
) -> Result<Option<T>, D::Error> {
    // error if cannot deserialise into a Value (which includes null, empty string or empty object)
    let value: Value = Value::deserialize(d)?;
    return match value {
        Value::Null => Ok(None),
        Value::String(s) if s.is_empty() => Ok(None),
        // check if values as an empty object `{}`
        Value::Sequence(ref map) if map.is_empty() => Ok(None),
        Value::Mapping(ref map) if map.is_empty() => Ok(None),
        _ => {
            // if value is not null, empty string or empty object, extract struct T from value
            let result: Result<Option<T>, D::Error> = T::deserialize(value.into_deserializer())
                .map(Some)
                .map_err(Error::custom);
            result
        }
    };
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

pub fn empty_str_or_i32<'de, D: Deserializer<'de>>(d: D) -> Result<i32, D::Error> {
    let value = Value::deserialize(d)?;
    match value {
        Value::String(_) => Ok(0),
        Value::Number(n) => Ok(n.as_i64().unwrap_or(0) as i32),
        _ => Err(Error::custom("Expected a string or number")),
    }
}

pub fn string_to_f64<'de, D: Deserializer<'de>>(d: D) -> Result<f64, D::Error> {
    let s: String = String::deserialize(d)?;
    Ok(s.parse().unwrap_or(0.0))
}

pub fn zero_f64_as_none<'de, D: Deserializer<'de>>(d: D) -> Result<Option<f64>, D::Error> {
    let value = Value::deserialize(d)?;
    match value {
        Value::Number(n) => {
            let f = n.as_f64().unwrap_or(0.0);
            if f == 0.0 {
                Ok(None)
            } else {
                Ok(Some(f))
            }
        }
        _ => Err(Error::custom(
            "zero_f64_as_none Expected a string or number",
        )),
    }
}

#[cfg(test)]
mod test {

    use serde::{Deserialize, Serialize};

    use crate::sync::sync_serde::object_fields_as_option;

    #[allow(non_snake_case)]
    #[derive(Deserialize, Serialize, Clone, Debug, PartialEq)]
    pub struct OmsFields {
        #[serde(default)]
        pub foreign_exchange_rate: Option<f64>,
        #[serde(default)]
        pub contract_signed_datetime: Option<NaiveDateTime>,
        #[serde(default)]
        pub advance_paid_datetime: Option<NaiveDateTime>,
    }

    #[allow(non_snake_case)]
    #[derive(Deserialize, Serialize, Debug, PartialEq)]
    pub struct LegacyRowWithOmsObjectField {
        #[serde(rename = "ID")]
        pub id: String,
        #[serde(default)]
        #[serde(deserialize_with = "object_fields_as_option")]
        pub oms_fields: Option<OmsFields>,
    }

    use chrono::NaiveDateTime;
    #[test]
    fn test_handle_object_fields_translation() {
        // case with populated fields
        const LEGACY_ROW_1: (&str, &str) = (
            "LEGACY_ROW_1",
            r#"{
                "ID": "LEGACY_ROW_1",
                "oms_fields": {
                    "foreign_exchange_rate": 1.6,
                    "contract_signed_datetime": "2021-01-22T15:16:00"
                }
            }"#,
        );
        let a = serde_json::from_str::<LegacyRowWithOmsObjectField>(&LEGACY_ROW_1.1);
        assert!(a.is_ok());
        let fields = a.unwrap().oms_fields.unwrap();
        assert_eq!(fields.foreign_exchange_rate, Some(1.6));
        assert_eq!(
            fields.contract_signed_datetime,
            Some(
                NaiveDateTime::parse_from_str("2021-01-22T15:16:00", "%Y-%m-%dT%H:%M:%S").unwrap()
            )
        );
        assert_eq!(fields.advance_paid_datetime, None);

        // case with empty object
        const LEGACY_ROW_2: (&str, &str) = (
            "LEGACY_ROW_2",
            r#"{
                "ID": "LEGACY_ROW_2",
                "oms_fields": {}
            }"#,
        );
        let b = serde_json::from_str::<LegacyRowWithOmsObjectField>(&LEGACY_ROW_2.1);
        assert!(b.is_ok());

        // case with empty string
        const LEGACY_ROW_3: (&str, &str) = (
            "LEGACY_ROW_3",
            r#"{
                "ID": "LEGACY_ROW_3",
                "oms_fields": ""
            }"#,
        );
        let c = serde_json::from_str::<LegacyRowWithOmsObjectField>(&LEGACY_ROW_3.1).unwrap();
        assert_eq!(c.oms_fields, None);

        // case with null
        const LEGACY_ROW_4: (&str, &str) = (
            "LEGACY_ROW_4",
            r#"{
                "ID": "LEGACY_ROW_4",
                "oms_fields": null
            }"#,
        );
        let d = serde_json::from_str::<LegacyRowWithOmsObjectField>(&LEGACY_ROW_4.1);
        assert!(d.is_ok());

        // case with no value
        const LEGACY_ROW_5: (&str, &str) = (
            "LEGACY_ROW_5",
            r#"{
                "ID": "LEGACY_ROW_5"            }"#,
        );
        let e = serde_json::from_str::<LegacyRowWithOmsObjectField>(&LEGACY_ROW_5.1);
        assert!(e.is_ok());
    }
}
