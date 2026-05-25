use chrono::NaiveDate;
use repository::{SyncBufferRow, SyncMessageRow, SyncMessageRowStatus, SyncMessageRowType};
use serde_json::json;

use crate::sync::{
    test::{TestSyncIncomingRecord, TestSyncOutgoingRecord},
    translations::PullTranslateResult,
};

pub const TABLE_NAME: &str = "om_sync_message";

const MESSAGE_1: (&str, &str) = (
    "om_sync_message_1",
    r#"{
    "id": "om_sync_message_1",
    "to_store_id": "store_a",
    "from_store_id": "store_b",
    "body": "{\"key\":\"value\"}",
    "created_datetime": "2023-01-01T02:03:04",
    "status": "New",
    "type": "SupportUpload",
    "error_message": null
}"#,
);

pub fn message_1() -> TestSyncIncomingRecord {
    let row = SyncMessageRow {
        id: "om_sync_message_1".to_string(),
        to_store_id: Some("store_a".to_string()),
        from_store_id: Some("store_b".to_string()),
        body: "{\"key\":\"value\"}".to_string(),
        created_datetime: NaiveDate::from_ymd_opt(2023, 1, 1)
            .unwrap()
            .and_hms_opt(2, 3, 4)
            .unwrap(),
        status: SyncMessageRowStatus::New,
        r#type: SyncMessageRowType::SupportUpload,
        error_message: None,
    };

    TestSyncIncomingRecord {
        translated_record: PullTranslateResult::upsert(row.clone()),
        sync_buffer_row: SyncBufferRow {
            table_name: TABLE_NAME.to_string(),
            record_id: MESSAGE_1.0.to_string(),
            data: MESSAGE_1.1.to_string(),
            ..Default::default()
        },
        extra_data: None,
    }
}

fn message_1_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: MESSAGE_1.0.to_string(),
        push_data: json!({
            "id": "om_sync_message_1",
            "to_store_id": "store_a",
            "from_store_id": "store_b",
            "body": "{\"key\":\"value\"}",
            "created_datetime": "2023-01-01T02:03:04",
            "status": "New",
            "type": "SupportUpload",
            "error_message": null
        }),
    }
}

pub fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![message_1()]
}

pub fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![message_1_push_record()]
}
