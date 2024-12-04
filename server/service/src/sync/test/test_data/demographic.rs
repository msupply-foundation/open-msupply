use repository::demographic_row::DemographicRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "demographic";

const DEMOGRAPHIC1: (&str, &str) = (
    "test_demographic",
    r#"{
        "id":  "test_demographic",
        "name": "test demographic"
    }"#,
);

fn demographic1() -> DemographicRow {
    DemographicRow {
        id: DEMOGRAPHIC1.0.to_string(),
        name: "test demographic".to_string(),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        DEMOGRAPHIC1,
        demographic1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: DEMOGRAPHIC1.0.to_string(),
        push_data: json!(demographic1()),
    }]
}
