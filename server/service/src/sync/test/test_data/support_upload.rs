use repository::{SupportUploadRow, SupportUploadStatus};
use serde_json::json;
use util::Defaults;

use crate::sync::test::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "support_upload";

const SUPPORT_UPLOAD1: (&str, &str) = (
    "support-upload-dfw1-1234-faba934ghlad",
    r#"{
        "id": "support-upload-dfw1-1234-faba934ghlad", 
        "datetime": "2020-01-22T15:16:00",
        "site_id": "1",
        "title": "database error",
        "status": "InProgress",
        "upload_start_datetime": "2020-01-22T15:16:00"
    }"#,
);

fn support_upload1() -> SupportUploadRow {
    SupportUploadRow {
        id: SUPPORT_UPLOAD1.0.to_string(),
        datetime: Defaults::naive_date_time(),
        site_id: "1".to_string(),
        title: Some("database error".to_string()),
        status: SupportUploadStatus::InProgress,
        upload_start_datetime: Defaults::naive_date_time(),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        SUPPORT_UPLOAD1,
        support_upload1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: SUPPORT_UPLOAD1.0.to_string(),
        push_data: json!(support_upload1()),
    }]
}
