use serde_json::{Map, Value};

// Error type for json_diff function

#[derive(Debug)]
pub enum JsonDiffError {
    SerializationError(String),
}

/// Compares two Serializable values (using json) and returns only the differences
/// E.g. if a field changed from 1 to 2, the output will be ({ "field": 1 }, { "field": 2 })
/// Recursion for nested objects is not implemented for now, to keep it simple.
pub fn json_diff(
    old: &impl serde::Serialize,
    new: &impl serde::Serialize,
) -> Result<Option<(Value, Value)>, JsonDiffError> {
    // Serialize both values to JSON
    let old_json = serde_json::to_value(old)
        .map_err(|e| JsonDiffError::SerializationError(format!("{}", e)))?;

    let new_json = serde_json::to_value(new)
        .map_err(|e| JsonDiffError::SerializationError(format!("{}", e)))?;

    let filtered_diff = match (old_json.clone(), new_json.clone()) {
        (Value::Object(old_map), Value::Object(new_map)) => {
            let mut old_diff = Map::new();
            let mut new_diff = Map::new();

            // Check all keys in both objects
            let all_keys: std::collections::HashSet<_> =
                old_map.keys().chain(new_map.keys()).collect();

            for key in all_keys {
                match (old_map.get(key), new_map.get(key)) {
                    (Some(old_val), Some(new_val)) => {
                        // Both exist, check if they're different
                        if old_val != new_val {
                            old_diff.insert(key.clone(), old_val.clone());
                            new_diff.insert(key.clone(), new_val.clone());
                        }
                    }
                    (Some(old_val), None) => {
                        // Key removed
                        old_diff.insert(key.clone(), old_val.clone());
                        new_diff.insert(key.clone(), Value::Null);
                    }
                    (None, Some(new_val)) => {
                        // Key added
                        old_diff.insert(key.clone(), Value::Null);
                        new_diff.insert(key.clone(), new_val.clone());
                    }
                    (None, None) => unreachable!(),
                }
            }

            if old_diff.is_empty() {
                None
            } else {
                Some((Value::Object(old_diff), Value::Object(new_diff)))
            }
        }
        _ => {
            // For non-objects, just return the values if they're different
            if old_json != new_json {
                Some((old_json.clone(), new_json.clone()))
            } else {
                None
            }
        }
    };
    Ok(filtered_diff)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::NaiveDate;
    use serde::{Deserialize, Serialize};

    #[derive(Serialize, Deserialize)]
    struct TestStruct {
        name: String,
        dob: Option<NaiveDate>,
        age: u32,
        active: bool,
    }

    #[test]
    fn test_no_difference() {
        let old = TestStruct {
            name: "Alice".to_string(),
            age: 30,
            dob: None,
            active: true,
        };
        let new = TestStruct {
            name: "Alice".to_string(),
            age: 30,
            dob: None,
            active: true,
        };

        let result = json_diff(&old, &new).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_field_changed() {
        let old = TestStruct {
            name: "Alice".to_string(),
            age: 30,
            dob: Some(NaiveDate::from_ymd_opt(1993, 1, 1).unwrap()),
            active: true,
        };
        let new = TestStruct {
            name: "Alice".to_string(),
            age: 31,
            dob: Some(NaiveDate::from_ymd_opt(1993, 1, 1).unwrap()),
            active: true,
        };

        let result = json_diff(&old, &new).unwrap();
        assert!(result.is_some());
        let (old_diff, new_diff) = result.unwrap();

        assert_eq!(old_diff["age"], 30);
        assert_eq!(new_diff["age"], 31);
        assert!(!old_diff.as_object().unwrap().contains_key("name"));
    }

    #[test]
    fn test_multiple_fields_changed() {
        let old = TestStruct {
            name: "Alice".to_string(),
            age: 30,
            dob: None,
            active: true,
        };
        let new = TestStruct {
            name: "Alice".to_string(),
            age: 31,
            dob: Some(NaiveDate::from_ymd_opt(1993, 1, 1).unwrap()),
            active: false,
        };

        let result = json_diff(&old, &new).unwrap();
        assert!(result.is_some());
        let (old_diff, new_diff) = result.unwrap();

        assert_eq!(new_diff.get("name"), None);
        assert_eq!(old_diff["age"], 30);
        assert_eq!(new_diff["age"], 31);
        assert_eq!(old_diff["active"], true);
        assert_eq!(new_diff["active"], false);
    }

    #[test]
    fn test_primitive_types() {
        let old = 42;
        let new = 43;

        let result = json_diff(&old, &new).unwrap();
        assert!(result.is_some());
        let (old_diff, new_diff) = result.unwrap();

        assert_eq!(old_diff, 42);
        assert_eq!(new_diff, 43);
    }

    #[test]
    fn test_primitive_no_change() {
        let old = "hello";
        let new = "hello";

        let result = json_diff(&old, &new).unwrap();
        assert!(result.is_none());
    }
}
