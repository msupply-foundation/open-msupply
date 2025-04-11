use crate::sync::test::{TestSyncIncomingRecord, TestSyncOutgoingRecord};
use repository::{PreferenceRow, PreferenceRowDelete};
use serde_json::json;

const TABLE_NAME: &str = "preference";

const PREFERENCE_1: (&str, &str) = (
    "preference_id1",
    r#"{
        "id": "preference_id1",
        "key": "preference_key1", 
        "value": "{\"data\": \"preference_value1\"}",
        "store_id": "4E27CEB263354EB7B1B33CEA8F7884D8"
    }"#,
);

fn preference() -> PreferenceRow {
    PreferenceRow {
        id: "preference_id1".to_string(),
        key: "preference_key1".to_string(),
        value: r#"{"data": "preference_value1"}"#.to_string(),
        store_id: Some("4E27CEB263354EB7B1B33CEA8F7884D8".to_string()),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        PREFERENCE_1,
        preference(),
    )]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    // New type for TestSyncToSyncRecord
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: PREFERENCE_1.0.to_string(),
        push_data: json!(preference()),
    }]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        PREFERENCE_1.0,
        PreferenceRowDelete(PREFERENCE_1.0.to_string()),
    )]
}
