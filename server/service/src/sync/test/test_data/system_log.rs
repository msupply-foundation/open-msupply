use crate::sync::test::{TestSyncIncomingRecord, TestSyncOutgoingRecord};
use chrono::NaiveDate;
use repository::system_log_row::{SystemLogRow, SystemLogType};
use serde_json::json;

const TABLE_NAME: &str = "system_log";

const SYSTEM_LOG_1: (&str, &str) = (
    "2c0dedfa-a878-46f3-939c-9c4d42e41a6e",
    r#"{
    "id": "2c0dedfa-a878-46f3-939c-9c4d42e41a6e",
    "type": "PROCESSOR_ERROR",
    "datetime": "2020-01-01T00:00:00",
    "message": "Unable to process transfer record for invoice ABCDEDF",
    "is_error": true
    }"#,
);

fn system_log_1() -> SystemLogRow {
    SystemLogRow {
        id: SYSTEM_LOG_1.0.to_string(),
        r#type: SystemLogType::ProcessorError,
        datetime: NaiveDate::from_ymd_opt(2020, 1, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap(),
        message: Some("Unable to process transfer record for invoice ABCDEDF".to_string()),
        sync_site_id: None,
        is_error: true,
    }
}
pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        SYSTEM_LOG_1,
        system_log_1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    // New type for TestSyncToSyncRecord
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: SYSTEM_LOG_1.0.to_string(),
        push_data: json!(system_log_1()),
    }]
}
