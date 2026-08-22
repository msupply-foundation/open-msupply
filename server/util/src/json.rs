use std::borrow::Cow;

// https://github.com/serde-rs/json/issues/377#issuecomment-341490464
pub fn merge_json(a: &mut serde_json::Value, b: &serde_json::Value) {
    match (a, b) {
        (&mut serde_json::Value::Object(ref mut a), serde_json::Value::Object(b)) => {
            for (k, v) in b {
                merge_json(a.entry(k.clone()).or_insert(serde_json::Value::Null), v);
            }
        }
        (a, b) => {
            *a = b.clone();
        }
    }
}

/// The NUL character, which Postgres text columns cannot store.
const NUL: char = '\u{0000}';

// Postgres text columns cannot store the NUL character (0x00), inserting a string that
// contains one fails with `invalid byte sequence for encoding "UTF8": 0x00`. Legacy mSupply
// sometimes sends NUL padded strings, and sqlite sites (which do accept NULs) can pass them
// on to a Postgres server over sync.
//
// Note the helpers below operate on parsed json, not on serialised json text. A textual
// replace of the escape sequence would also match the tail of an escaped backslash, in a
// string that legitimately contains those six characters, leaving a dangling escape and
// making the json unparsable.

/// True if any string in `value` contains a NUL. Read only, so it can be used to avoid
/// cloning the (vast majority of) records that don't need stripping.
pub fn json_contains_nulls(value: &serde_json::Value) -> bool {
    match value {
        serde_json::Value::String(string) => string.contains(NUL),
        serde_json::Value::Array(values) => values.iter().any(json_contains_nulls),
        serde_json::Value::Object(map) => map.values().any(json_contains_nulls),
        // Numbers, bools and null cannot contain a NUL. Object keys are not checked, they map
        // to struct fields when the record is deserialised, so never reach the database as a
        // value.
        _ => false,
    }
}

/// Recursively remove NULs from every string in `value`.
pub fn strip_json_nulls(value: &mut serde_json::Value) {
    match value {
        serde_json::Value::String(string) => {
            if string.contains(NUL) {
                string.retain(|char| char != NUL);
            }
        }
        serde_json::Value::Array(values) => values.iter_mut().for_each(strip_json_nulls),
        serde_json::Value::Object(map) => map.values_mut().for_each(strip_json_nulls),
        _ => {}
    }
}

/// `value` with all NULs removed, borrowed unchanged when there are none to remove (the
/// common case, so no clone and no allocation).
pub fn json_without_nulls(value: &serde_json::Value) -> Cow<'_, serde_json::Value> {
    if !json_contains_nulls(value) {
        return Cow::Borrowed(value);
    }

    let mut owned = value.clone();
    strip_json_nulls(&mut owned);
    Cow::Owned(owned)
}

#[cfg(test)]
mod test {
    use super::*;
    use serde_json::json;

    #[test]
    fn json_without_nulls_removes_nuls_from_nested_strings() {
        let value = json!({
            "itemName": "Amoxicillin\u{0000}\u{0000}",
            "comment": "no nuls here",
            "quantity": 10.0,
            "authorised": true,
            "optionID": null,
            "lines": [{ "name": "\u{0000}Paracetamol" }, "plain\u{0000}string"],
        });

        assert!(json_contains_nulls(&value));
        assert_eq!(
            json_without_nulls(&value).into_owned(),
            json!({
                "itemName": "Amoxicillin",
                "comment": "no nuls here",
                "quantity": 10.0,
                "authorised": true,
                "optionID": null,
                "lines": [{ "name": "Paracetamol" }, "plainstring"],
            })
        );
    }

    #[test]
    fn json_without_nulls_borrows_when_there_is_nothing_to_strip() {
        let value = json!({ "itemName": "Amoxicillin", "quantity": 10.0 });

        assert!(!json_contains_nulls(&value));
        assert!(matches!(json_without_nulls(&value), Cow::Borrowed(_)));
    }

    #[test]
    fn json_without_nulls_keeps_literal_escape_sequence_text() {
        // A field that legitimately contains the characters of the NUL escape sequence must
        // be left alone, a textual replace would eat the escaped backslash and leave the
        // serialised record unparsable
        let value = json!({ "comment": r"\u0000" });

        assert!(!json_contains_nulls(&value));
        // Still parsable after a serialise round trip
        let serialised = serde_json::to_string(&json_without_nulls(&value)).unwrap();
        assert_eq!(
            serde_json::from_str::<serde_json::Value>(&serialised).unwrap(),
            value
        );
    }
}
