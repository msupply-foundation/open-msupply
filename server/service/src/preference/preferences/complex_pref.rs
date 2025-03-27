use serde::{Deserialize, Serialize};
use serde_json::json;

use super::Preference;

#[derive(Clone, Default, Deserialize, Serialize)]
pub struct ComplexPref {
    pub something_here: i32,
    pub something_else: String,
}

pub struct ComplexOne;

impl Preference for ComplexOne {
    type Value = ComplexPref;

    fn key() -> &'static str {
        "complex_one"
    }

    fn json_schema() -> serde_json::Value {
        json!({
          "properties": {
            "value": {
                "type": "object",
                "properties": {
                    "somethingHere": {
                        "type": "string"
                    },
                    "somethingElse": {
                        "type": "string"
                    }
                }
            }
          },
        })
    }

    fn ui_schema() -> serde_json::Value {
        json!({
           "type": "VerticalLayout",
          "scope": "#/properties/value",
            "elements": [
                {
          "type": "Control",
          "scope": "/properties/somethingHere"
                },
                {
          "type": "Control",
          "scope": "/properties/somethingElse"
                }
            ]
        })
    }
}
