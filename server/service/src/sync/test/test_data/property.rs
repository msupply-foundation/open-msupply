use repository::{property_row::PropertyRow, PropertyType};
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "property";

const PROPERTY1: (&str, &str) = (
    "abcbea92-d5bf-4832-863b-c04e093a7760",
    r#"{
        "id": "abcbea92-d5bf-4832-863b-c04e093a7760",
        "type": "text",
        "name": "Your favourite colour",
        "translation_key": null,
        "deleted_datetime": null
    }"#,
);

fn property1() -> PropertyRow {
    PropertyRow {
        id: PROPERTY1.0.to_string(),
        r#type: PropertyType::Text.as_str().to_string(),
        name: "Your favourite colour".to_string(),
        translation_key: None,
        deleted_datetime: None,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PROPERTY1,
        property1(),
    )]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PROPERTY1.0.to_string(),
        push_data: json!(property1()),
    }]
}
