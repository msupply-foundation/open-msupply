use repository::FormSchemaJson;
use serde_json::json;
// Data in this file is used in "test_om_report_translation" and "test_sync_pull_and_push"
use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};
const TABLE_NAME: &str = "om_form_schema";
const FORM_SCHEMA: (&str, &str) = (
    "for_4973907f-835b-4035-8dd1-6e63f5713dcf",
    r#"{
        "id":  "for_4973907f-835b-4035-8dd1-6e63f5713dcf",
        "type": "reportArgument",
        "json_schema": "json schema data",
        "ui_schema": "ui schema data"
    }"#,
);
fn form_schema() -> FormSchemaJson {
    FormSchemaJson {
        id: FORM_SCHEMA.0.to_string(),
        r#type: "reportArgument".to_string(),
        json_schema: serde_json::Value::from("json schema data"),
        ui_schema: serde_json::Value::from("ui schema data"),
    }
}
pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        FORM_SCHEMA,
        form_schema(),
    )]
}
pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: FORM_SCHEMA.0.to_string(),
        push_data: json!(form_schema()),
    }]
}
