use repository::{property_row::PropertyRow, types::PropertyValueType};
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "property";

const PROPERTY1: (&str, &str) = (
    "abcbea92-d5bf-4832-863b-c04e093a7760",
    r#"{
        "id": "abcbea92-d5bf-4832-863b-c04e093a7760",
        "key": "favourite_colour",
        "name": "Your favourite colour",
        "value_type": "STRING",
        "allowed_values": "Blue,Yellow"
    }"#,
);

fn property1() -> PropertyRow {
    PropertyRow {
        id: PROPERTY1.0.to_string(),
        key: "favourite_colour".to_string(),
        name: "Your favourite colour".to_string(),
        value_type: PropertyValueType::String,
        allowed_values: Some("Blue,Yellow".to_string()),
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
