use std::collections::VecDeque;

use chrono::{DateTime, Utc};
use serde_json::Value;

use super::merge::{three_way_merge_object, two_way_merge_object, ConflictSolver, MergeObject};

// Todo make this configurable?
const OBJECT_ARRAY_KEY: &str = "key";

/// Merges arrays that only contain objects and all objects contain a string "key".
/// For example:
/// ```json
/// [
///   {
///     "key": "key1",
///     "value": ...
///   },
///   {
///     "key": "key2",
///     "value:" ...
///   }
/// ]
/// ```
/// If the array contains elements that don't fit this pattern the parent solver is used to solve
/// the conflict.
pub struct ObjectArrayConflictSolver {
    parent: Box<dyn ConflictSolver>,
    our_time: DateTime<Utc>,
    their_time: DateTime<Utc>,
}

impl ObjectArrayConflictSolver {
    fn prefer_our_for_sorting(&self) -> bool {
        self.our_time > self.their_time
    }
}

impl ConflictSolver for ObjectArrayConflictSolver {
    fn solve(
        &self,
        our: Option<&Value>,
        their: Option<&Value>,
        base: Option<&Value>,
    ) -> Option<Value> {
        if let (Some(our), Some(their), Some(base)) = (our, their, base) {
            // three way merge
            match (our, their, base) {
                (Value::Array(o), Value::Array(t), Value::Array(b)) => {
                    if let Some(merged) = three_way_merge_object_array(
                        o,
                        t,
                        b,
                        self.parent.as_ref(),
                        OBJECT_ARRAY_KEY,
                        self.prefer_our_for_sorting(),
                    ) {
                        return Some(Value::Array(merged));
                    }
                }
                _ => {}
            }
        } else if let (Some(our), Some(their)) = (our, their) {
            // two way merge
            match (our, their) {
                (Value::Array(o), Value::Array(t)) => {
                    if let Some(merged) = two_way_merge_object_array(
                        o,
                        t,
                        self.parent.as_ref(),
                        OBJECT_ARRAY_KEY,
                        self.prefer_our_for_sorting(),
                    ) {
                        return Some(Value::Array(merged));
                    }
                }
                _ => {}
            };
        }
        return self.parent.solve(our, their, None);
    }
}

/// Test that all members are objects and that all object contain a `key` of type string.
/// If this is the case the array keys are returned.
fn extract_array_keys(array: &Vec<Value>, key: &str) -> Option<std::collections::VecDeque<String>> {
    let mut result = VecDeque::<String>::new();
    for item in array {
        let obj = match item {
            Value::Object(obj) => obj,
            _ => return None,
        };

        let value = match obj.get(key) {
            Some(value) => value,
            None => return None,
        };

        let key_value = match value {
            Value::String(key) => key,
            _ => return None,
        };

        result.push_back(key_value.to_string());
    }
    Some(result)
}

/// Takes the array_keys from extract_array_keys and the original array and move the values into
/// a MergeObject
fn obj_array_to_object(array_keys: &VecDeque<String>, array: &Vec<Value>) -> MergeObject {
    debug_assert_eq!(array_keys.len(), array.len());

    let mut result = MergeObject::new();
    for (i, key) in array_keys.iter().enumerate() {
        result.insert(key.to_owned(), array[i].clone());
    }
    result
}

/// Moves the merged object back into an array.
/// This method tries to keep the original array order and tries to insert new items at the correct
/// position.
fn array_object_to_array(
    mut our_keys: VecDeque<String>,
    mut their_keys: VecDeque<String>,
    base: &MergeObject,
    mut merged: MergeObject,
    prefer_our: bool,
) -> Vec<Value> {
    let mut result = Vec::new();

    loop {
        // Check if front keys are already handled and remove them if this is the case
        let our_key = our_keys.get(0);
        if let Some(our_key) = our_key {
            if !merged.contains_key(our_key) {
                our_keys.pop_front();
                continue;
            }
        }
        let their_key = their_keys.get(0);
        if let Some(their_key) = their_key {
            if !merged.contains_key(their_key) {
                their_keys.pop_front();
                continue;
            }
        }

        // Prefer new keys over existing keys otherwise decide depending on prefer_our
        let (take_ours, key) = match (our_key, their_key) {
            (None, None) => break,
            (None, Some(their_key)) => (false, their_key),
            (Some(our_key), None) => (true, our_key),
            (Some(our_key), Some(their_key)) => {
                let our_is_new = !base.contains_key(our_key);
                let theirs_is_new = !base.contains_key(their_key);

                let take_ours = match (our_is_new, theirs_is_new) {
                    (true, true) => prefer_our,
                    (true, false) => true,
                    (false, true) => false,
                    (false, false) => prefer_our,
                };
                if take_ours {
                    (true, our_key)
                } else {
                    (false, their_key)
                }
            }
        };
        if take_ours {
            if let Some((_, value)) = merged.remove_entry(key) {
                result.push(value);
            } else {
                debug_assert!(false, "Should not happen, bug...");
            }
        } else {
            if let Some((_, value)) = merged.remove_entry(key) {
                result.push(value);
            } else {
                debug_assert!(false, "Should not happen, bug...");
            }
        }
    }

    result
}

fn two_way_merge_object_array(
    ours: &Vec<serde_json::Value>,
    theirs: &Vec<serde_json::Value>,
    strategy: &dyn ConflictSolver,
    array_object_key: &str,
    prefer_our: bool,
) -> Option<Vec<serde_json::Value>> {
    let (our_keys, their_keys) = match (
        extract_array_keys(ours, array_object_key),
        extract_array_keys(theirs, array_object_key),
    ) {
        (Some(ours), Some(theirs)) => (ours, theirs),
        _ => return None,
    };

    let ours_obj = obj_array_to_object(&our_keys, ours);
    let theirs_obj = obj_array_to_object(&their_keys, theirs);

    let merged = two_way_merge_object(&ours_obj, &theirs_obj, strategy);

    // There is no base object; use an empty one
    let base = MergeObject::new();
    Some(array_object_to_array(
        our_keys, their_keys, &base, merged, prefer_our,
    ))
}

fn three_way_merge_object_array(
    ours: &Vec<serde_json::Value>,
    theirs: &Vec<serde_json::Value>,
    base: &Vec<serde_json::Value>,
    strategy: &dyn ConflictSolver,
    array_object_key: &str,
    prefer_our: bool,
) -> Option<Vec<serde_json::Value>> {
    let (our_keys, their_keys, base_keys) = match (
        extract_array_keys(ours, array_object_key),
        extract_array_keys(theirs, array_object_key),
        extract_array_keys(base, array_object_key),
    ) {
        (Some(ours), Some(theirs), Some(base)) => (ours, theirs, base),
        _ => return None,
    };

    let ours = obj_array_to_object(&our_keys, ours);
    let theirs = obj_array_to_object(&their_keys, theirs);
    let base = obj_array_to_object(&base_keys, base);

    let merged = three_way_merge_object(&ours, &theirs, &base, strategy);
    Some(array_object_to_array(
        our_keys, their_keys, &base, merged, prefer_our,
    ))
}

#[cfg(test)]
mod object_array_merge_test {
    use assert_json_diff::assert_json_eq;
    use chrono::{DateTime, NaiveDate, Utc};
    use serde_json::*;

    use crate::document::merge::{three_way_merge, two_way_merge, TakeOurConflictSolver};

    use super::ObjectArrayConflictSolver;

    #[test]
    fn test_object_array_two_way_merge() {
        let theirs = json!({
          "array1": [{
            "key": "1",
            "value1": "value1",
          },
          {
            "key": "2",
            "value1": "value1",
          },
          {
            "key": "3",
            "value1": "value1",
          }]
        });
        let ours = json!({
          "array1": [{
            "key": "1",
            "value1": "value1",
          },
          {
            "key": "2",
            "value1": "value2",
          }]
        });
        let solver = ObjectArrayConflictSolver {
            parent: Box::new(TakeOurConflictSolver {}),
            our_time: DateTime::<Utc>::from_utc(
                NaiveDate::from_ymd(2022, 1, 24).and_hms(11, 38, 0),
                Utc,
            ),
            their_time: DateTime::<Utc>::from_utc(
                NaiveDate::from_ymd(2022, 1, 20).and_hms(1, 3, 0),
                Utc,
            ),
        };
        let result = two_way_merge(&ours, &theirs, &solver);
        assert_json_eq!(
            &result,
            json!({
              "array1": [{
                "key": "1",
                "value1": "value1",
              },
              {
                "key": "2",
                "value1": "value2",
              },
              {
                "key": "3",
                "value1": "value1",
              }]
            })
        );
    }

    #[test]
    fn test_object_array_two_way_merge_sort() {
        let theirs = json!({
          "array1": [{
            "key": "1",
            "value1": "value1",
          },
          {
            "key": "2",
            "value1": "value2",
          }]
        });
        let ours = json!({
          "array1": [{
            "key": "a",
            "value1": "value_a",
          },
          {
            "key": "b",
            "value1": "value_b",
          }]
        });
        let solver = ObjectArrayConflictSolver {
            parent: Box::new(TakeOurConflictSolver {}),
            our_time: DateTime::<Utc>::from_utc(
                NaiveDate::from_ymd(2022, 1, 24).and_hms(11, 38, 0),
                Utc,
            ),
            their_time: DateTime::<Utc>::from_utc(
                NaiveDate::from_ymd(2022, 1, 20).and_hms(1, 3, 0),
                Utc,
            ),
        };
        let result = two_way_merge(&ours, &theirs, &solver);
        // append both arrays with our entries first
        assert_json_eq!(
            &result,
            json!({
              "array1": [{
                "key": "a",
                "value1": "value_a",
              },
              {
                "key": "b",
                "value1": "value_b",
              },
              {
                "key": "1",
                "value1": "value1",
              },
              {
                "key": "2",
                "value1": "value2",
              }]
            })
        );
    }

    #[test]
    fn test_object_array_three_way_merge() {
        let base = json!({
          "array1": [{
            "key": "1",
            "value1": "value1",
          },
          {
            "key": "2",
            "value1": "value1",
          }]
        });
        let ours = json!({
          "array1": [{
            "key": "2",
            "value1": "ours",
          },
          {
            "key": "3",
            "value1": "ours",
          }]
        });
        let theirs = json!({
          "array1": [{
            "key": "1",
            "value1": "value1",
          },
          {
            "key": "2",
            "value1": "theirs",
          }]
        });
        let solver = ObjectArrayConflictSolver {
            parent: Box::new(TakeOurConflictSolver {}),
            our_time: DateTime::<Utc>::from_utc(
                NaiveDate::from_ymd(2022, 1, 24).and_hms(11, 38, 0),
                Utc,
            ),
            their_time: DateTime::<Utc>::from_utc(
                NaiveDate::from_ymd(2022, 1, 20).and_hms(1, 3, 0),
                Utc,
            ),
        };
        let result = three_way_merge(&ours, &theirs, &base, &solver);
        assert_json_eq!(
            &result,
            json!({
              "array1": [{
                "key": "2",
                "value1": "ours",
              },
              {
                "key": "3",
                "value1": "ours",
              }]
            })
        );
    }

    #[test]
    fn test_object_array_three_way_merge_sort_order() {
        let base = json!({
          "array1": [{
            "key": "1",
            "value1": "base1",
          },
          {
            "key": "2",
            "value1": "base2",
          },
          {
            "key": "3",
            "value1": "base3",
          }]
        });
        let ours = json!({
          "array1": [
            {
              "key": "0",
              "value1": "ours0",
            },
            {
              "key": "2",
              "value1": "ours1",
            },
            {
              "key": "3",
              "value1": "base3",
            },
            {
              "key": "5",
              "value1": "ours5",
            },
            {
              "key": "6",
              "value1": "ours6",
            }]
        });
        let theirs = json!({
          "array1": [
            {
              "key": "1",
              "value1": "base1",
            },
            {
              "key": "2",
              "value1": "theirs2",
            },
            {
              "key": "a",
              "value1": "theirs_a",
            },
            {
              "key": "b",
              "value1": "theirs_b",
            },
            {
              "key": "3",
              "value1": "base3",
            }]
        });
        let solver = ObjectArrayConflictSolver {
            parent: Box::new(TakeOurConflictSolver {}),
            our_time: DateTime::<Utc>::from_utc(
                NaiveDate::from_ymd(2022, 1, 24).and_hms(11, 38, 0),
                Utc,
            ),
            their_time: DateTime::<Utc>::from_utc(
                NaiveDate::from_ymd(2022, 1, 20).and_hms(1, 3, 0),
                Utc,
            ),
        };
        let result = three_way_merge(&ours, &theirs, &base, &solver);
        println!("{}", result);
        assert_json_eq!(
            &result,
            json!({
              "array1": [
                {
                  "key": "0",
                  "value1": "ours0",
                },
                {
                  "key": "2",
                  "value1": "ours1",
                },
                {
                  "key": "a",
                  "value1": "theirs_a",
                },
                {
                  "key": "b",
                  "value1": "theirs_b",
                },
                {
                  "key": "3",
                  "value1": "base3",
                },
                {
                  "key": "5",
                  "value1": "ours5",
                },
                {
                  "key": "6",
                  "value1": "ours6",
                }
              ]
            })
        );
    }
}
