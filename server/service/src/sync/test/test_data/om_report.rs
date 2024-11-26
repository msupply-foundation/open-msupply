use repository::OmReportRow;
use serde_json::json;

// Data in this file is used in "test_om_report_translation" and "test_sync_pull_and_push"
use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "om_report";

const REPORT: (&str, &str) = (
    "4973907f-835b-4035-8dd1-6e63f5713dcf",
    r#"{
        "id":  "4973907f-835b-4035-8dd1-6e63f5713dcf",
        "data": "report data"
    }"#,
);

fn report() -> OmReportRow {
    OmReportRow {
        id: REPORT.0.to_string(),
        data: "report data".to_string(),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        REPORT,
        report(),
    )]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: REPORT.0.to_string(),
        push_data: json!(report()),
    }]
}
