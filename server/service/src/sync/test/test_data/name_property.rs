use repository::name_property_row::NamePropertyRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "name_property";

const NAME_PROPERTY1: (&str, &str) = (
    "59d20a10-0555-4e65-9c36-2c86e50e5def",
    r#"{
        "id": "59d20a10-0555-4e65-9c36-2c86e50e5def",
        "property_id": "property_a",
        "remote_editable": false
    }"#,
);

fn name_property1() -> NamePropertyRow {
    NamePropertyRow {
        id: NAME_PROPERTY1.0.to_string(),
        property_id: "property_a".to_string(),
        remote_editable: false,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        NAME_PROPERTY1,
        name_property1(),
    )]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: NAME_PROPERTY1.0.to_string(),
        push_data: json!(name_property1()),
    }]
}
