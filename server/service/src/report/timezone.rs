use serde_json::Value;
use util::timezone::{Tz, report_timezone};

/// A report's arguments with `timezone` always set to a timezone chrono-tz knows: the one the
/// request sent, else UTC (see [`report_timezone`]).
///
/// Everything downstream reads the report's timezone from here: the SQL queries (as `$timezone`),
/// `convert_data`'s local time and the templates' `date` filter and `now()`. So a report never has
/// to cope with it missing.
///
/// Arguments that aren't an object are left alone: there is nowhere to put the timezone.
pub fn with_report_timezone(arguments: Option<Value>) -> Option<Value> {
    let mut arguments = match arguments {
        None | Some(Value::Null) => serde_json::Map::new(),
        Some(Value::Object(arguments)) => arguments,
        Some(other) => return Some(other),
    };

    let requested = arguments.get("timezone").and_then(Value::as_str);
    let timezone = report_timezone(requested);
    if let Some(requested) = requested
        && requested != timezone.name()
    {
        log::warn!(
            "Unknown report timezone `{requested}`, using `{}`",
            timezone.name()
        );
    }
    arguments.insert(
        "timezone".to_string(),
        Value::String(timezone.name().to_string()),
    );

    Some(Value::Object(arguments))
}

/// The timezone [`with_report_timezone`] put in the arguments.
pub(crate) fn arguments_timezone(arguments: &Option<Value>) -> Tz {
    report_timezone(
        arguments
            .as_ref()
            .and_then(|arguments| arguments.get("timezone"))
            .and_then(Value::as_str),
    )
}

#[cfg(test)]
mod test {
    use serde_json::json;

    use super::*;

    #[test]
    fn timezone_is_always_set() {
        assert_eq!(
            with_report_timezone(Some(
                json!({ "timezone": "Pacific/Auckland", "after": "x" })
            )),
            Some(json!({ "timezone": "Pacific/Auckland", "after": "x" }))
        );

        assert_eq!(
            with_report_timezone(None),
            Some(json!({ "timezone": "UTC" }))
        );
        assert_eq!(
            with_report_timezone(Some(json!({ "timezone": "Not/AZone" }))),
            Some(json!({ "timezone": "UTC" }))
        );
        assert_eq!(with_report_timezone(Some(json!([1]))), Some(json!([1])));
    }
}
