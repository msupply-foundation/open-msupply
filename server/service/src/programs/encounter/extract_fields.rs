use serde_json::Value;

/// Extract a value by path from a json object.
/// Returns a json null value if the path is invalid
fn extract_field(path: &Vec<String>, data: &Value) -> Value {
    let mut data_part = Some(data);
    for part in path {
        let d = match data_part {
            Some(d) => d,
            None => return Value::Null,
        };
        if let Value::Object(obj) = d {
            data_part = obj.get(part);
        } else {
            data_part = None;
        }
    }
    data_part.map(|d| d.to_owned()).unwrap_or(Value::Null)
}

/// Tries to extract all fields from all the provided data
pub fn extract_fields(fields: &[String], data: &Value) -> Vec<Value> {
    let field_paths: Vec<Vec<String>> = fields
        .iter()
        .map(|s| s.split('.').map(|p| p.to_string()).collect::<Vec<String>>())
        .collect();

    let field_values = field_paths
        .iter()
        .map(|path| extract_field(path, data))
        .collect();
    field_values
}

#[cfg(test)]
mod document_service_test {
    use serde_json::Value;

    use super::{extract_field, extract_fields};

    #[test]
    fn test_field_extraction() {
        let result = extract_field(
            &vec!["value".to_string()],
            &serde_json::json!({
              "value": "value",
              "noise": 45
            }),
        );
        assert_eq!(result, "value");

        let result = extract_field(
            &vec!["obj1".to_string(), "obj2".to_string(), "value".to_string()],
            &serde_json::json!({
              "obj1": {
                "obj2": {
                  "value": "value2",
                  "noise": 45
                }
              }
            }),
        );
        assert_eq!(result, "value2");

        let result = extract_field(
            &vec!["obj1".to_string(), "obj3".to_string(), "value".to_string()],
            &serde_json::json!({
              "obj1": {
                "obj2": {
                  "value": "value2",
                  "noise": 45
                }
              }
            }),
        );
        assert_eq!(result, Value::Null);
    }

    #[test]
    fn test_fields_extraction() {
        let result = extract_fields(
            &["value".to_string(), "value2".to_string()],
            &serde_json::json!({
              "value": "value",
              "value2": 45
            }),
        );
        assert_eq!(
            result,
            vec![Value::String("value".to_string()), Value::Number(45.into())]
        );

        let result = extract_fields(
            &[
                "obj1.obj2.value".to_string(),
                "obj1.unvalid.value".to_string(),
            ],
            &serde_json::json!({
            "obj1": {
              "obj2": {
                "value": "value1",
                "noise": 45
              }
            }}),
        );
        assert_eq!(
            result,
            vec![Value::String("value1".to_string()), Value::Null]
        );
    }
}
