use chrono::{NaiveDate, NaiveTime};
use repository::{SyncBufferRow, SyncMessageRow, SyncMessageRowStatus, SyncMessageRowType};
use serde_json::json;

use crate::sync::{
    test::{TestSyncIncomingRecord, TestSyncOutgoingRecord},
    translations::{
        sync_message::{LegacyMessageRow, LegacySyncMessageStatus},
        PullTranslateResult,
    },
};

pub const TABLE_NAME: &str = "message";

const MESSAGE_1: (&str, &str) = (
    "message1",
    r#"{
    "ID": "message1",
    "toStoreID": "store_a",
    "fromStoreID": "store_b",
    "body": {"key": "value"},
    "createdDate": "2023-01-01",
    "createdTime": 7384,
    "status": "new",
    "type": "SomethingNotInTheEnum"
}"#,
);

pub fn message_1() -> TestSyncIncomingRecord {
    let row = SyncMessageRow {
        id: "message1".to_string(),
        to_store_id: Some("store_a".to_string()),
        from_store_id: Some("store_b".to_string()),
        body: "{\"key\":\"value\"}".to_string(),
        created_datetime: NaiveDate::from_ymd_opt(2023, 1, 1)
            .unwrap()
            .and_hms_opt(2, 3, 4)
            .unwrap(),
        status: SyncMessageRowStatus::New,
        r#type: SyncMessageRowType::Other("SomethingNotInTheEnum".to_string()),
        error_message: None,
    };

    TestSyncIncomingRecord {
        translated_record: PullTranslateResult::upsert(row),
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
        push_data: json!(LegacyMessageRow {
            id: MESSAGE_1.0.to_string(),
            to_store_id: Some("store_a".to_string()),
            from_store_id: Some("store_b".to_string()),
            body: json!({"key": "value"}),
            created_date: NaiveDate::from_ymd_opt(2023, 1, 1).unwrap(),
            created_time: NaiveTime::from_hms_opt(2, 3, 4).unwrap(),
            status: LegacySyncMessageStatus::New,
            r#type: SyncMessageRowType::Other("SomethingNotInTheEnum".to_string()),
            error_message: None,
        }),
    }
}

pub fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![message_1()]
}

pub fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![message_1_push_record()]
}
