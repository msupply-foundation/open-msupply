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

pub fn mock_form_schema_simplified_patient() -> FormSchema {
    FormSchema {
        id: "simplified_patient_form_schema".to_string(),
        r#type: "JsonForms".to_string(),
        json_schema: json!({
          "$schema": "http://json-schema.org/draft-07/schema#",
          "definitions": {
            "Gender": {
              "enum": [
                "FEMALE",
                "MALE",
                "TRANSGENDER",
                "TRANSGENDER_MALE",
                "TRANSGENDER_FEMALE",
                "UNKNOWN",
                "NON_BINARY"
              ],
              "type": "string"
            },
            "Patient": {
              "properties": {
                "birthPlace": {
                  "$ref": "#/definitions/Address",
                  "description": "Place of birth"
                },
                "code": {
                  "description": "Patient code, e.g. national id or other patient identifier",
                  "type": "string"
                },
                "code2": {
                  "description": "Secondary patient code, e.g. another type of health id",
                  "type": "string"
                },
                "dateOfBirth": {
                  "description": "184099003 Date of birth",
                  "format": "date",
                  "type": "string"
                },
                "dateOfBirthIsEstimated": {
                  "description": "Date of birth is estimated",
                  "type": "boolean"
                },
                "dateOfDeath": {
                  "description": "Date of death",
                  "format": "date",
                  "type": "string"
                },
                "extension": {
                  "type": "object"
                },
                "firstName": {
                  "type": "string"
                },
                "gender": {
                  "$ref": "#/definitions/Gender",
                  "description": "394744001 Gender unspecified"
                },
                "id": {
                  "description": "Medical record number\n\n398225001",
                  "type": "string"
                },
                "isDeceased": {
                  "description": "Person is deceased",
                  "type": "boolean"
                },
                "lastName": {
                  "description": "184096005 Patient Surname",
                  "type": "string"
                },
                "middleName": {
                  "type": "string"
                },
                "passportNumber": {
                  "description": "1601000122107 Passport Number",
                  "type": "string"
                }
              },
              "required": [
                "id"
              ],
              "type": "object"
            }
          },
          "type": "object",
          "allOf": [
            {
              "$ref": "#/definitions/Patient"
            }
          ]
        }),
        ui_schema: json!({}),
    }
}

pub fn mock_form_schemas() -> Vec<FormSchema> {
    vec![
        mock_form_schema_empty(),
        mock_form_schema_simple(),
        mock_form_schema_simplified_patient(),
    ]
}
