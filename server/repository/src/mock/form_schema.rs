use serde_json::json;

use crate::FormSchema;

pub fn mock_form_schema_empty() -> FormSchema {
    FormSchema {
        id: "empty".to_string(),
        r#type: "JsonForms".to_string(),
        json_schema: json!({}),
        ui_schema: json!({}),
    }
}

pub fn mock_form_schema_simple() -> FormSchema {
    FormSchema {
        id: "simple_form_schema".to_string(),
        r#type: "JsonForms".to_string(),
        json_schema: json!({
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "type": "object",
          "properties": {
            "intValue": {
              "type": "integer"
            },
            "strValue": {
              "type": "string"
            }
          },
          "required": [ "intValue" ]
        }),
        ui_schema: json!({}),
    }
}

pub fn mock_form_schemas() -> Vec<FormSchema> {
    vec![mock_form_schema_empty(), mock_form_schema_simple()]
}
