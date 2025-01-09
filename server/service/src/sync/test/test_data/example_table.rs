use repository::ExampleTableRow;
use serde_json::json;

// Data in this file is used in "test_example_table_translation" and "test_sync_pull_and_push"
use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "example_table";

const REPORT: (&str, &str) = (
    "4973907f-835b-4035-8dd1-6e63f5713dcf",
    r#"{
        "id":  "4973907f-835b-4035-8dd1-6e63f5713dcf",
        "data": "add_example_table data"
    }"#,
);

fn add_example_table() -> ExampleTableRow {
    ExampleTableRow {
        id: REPORT.0.to_string(),
        data: "add_example_table data".to_string(),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        REPORT,
        add_example_table(),
    )]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: REPORT.0.to_string(),
        push_data: json!(add_example_table()),
    }]
}
