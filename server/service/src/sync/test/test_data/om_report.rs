use crate::sync::test::{TestSyncIncomingRecord, TestSyncOutgoingRecord};
use repository::{ContextType, ReportRow};
use serde_json::json;

const TABLE_NAME: &str = "om_report";

const REPORT_1: (&str, &str) = (
    "76B6C424E1935C4DAF36A7A8F451FE72",
    r#"{
        "version": "1.0.0",
        "id": "76B6C424E1935C4DAF36A7A8F451FE72",
        "code": "test report code",
        "name": "Test",
        "comment": "Test comment",
        "context": "STOCKTAKE",
        "is_custom": false,
        "template": "template data",
        "sub_context": "test sub context",
        "is_active": true
    }"#,
);

fn report() -> ReportRow {
    ReportRow {
        id: REPORT_1.0.to_string(),
        name: "Test".to_string(),
        template: "template data".to_string(),
        context: ContextType::Stocktake,
        comment: Some("Test comment".to_string()),
        sub_context: Some("test sub context".to_string()),
        argument_schema_id: None,
        is_custom: false,
        version: "1.0.0".to_string(),
        code: "test report code".to_string(),
        is_active: true,
        ..Default::default()
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        REPORT_1,
        report(),
    )]
}

pub(crate) fn test_v6_central_push_records() -> Vec<TestSyncOutgoingRecord> {
    // New type for TestSyncToSyncRecord
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: REPORT_1.0.to_string(),
        push_data: json!(report()),
    }]
}
