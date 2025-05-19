use chrono::NaiveDate;
use repository::{MessageRow, MessageStatus, MessageType, SyncBufferRow};
use serde_json::json;
use util::inline_init;

use crate::sync::{
    test::TestSyncIncomingRecord,
    translations::{message::LegacyMessageRow, PullTranslateResult},
};

pub const TABLE_NAME: &str = "message";

const MESSAGE_1: (&str, &str) = (
    "message1",
    r#"{
    "ID": "message1",
    "toStoreID": "store_a",
    "fromStoreID": "store_b",
    "body": "{\"key\": \"value\"}",
    "createdDate": "2023-01-01",
    "createdTime": 7384,
    "status": "new",
    "type": "requestFieldChange"
}"#,
);

pub fn message_1() -> TestSyncIncomingRecord {
    let row = MessageRow {
        id: "message1".to_string(),
        to_store_id: "store_a".to_string(),
        from_store_id: Some("store_b".to_string()),
        body: "{\"key\": \"value\"}".to_string(),
        created_date: NaiveDate::from_ymd_opt(2023, 1, 1).unwrap(),
        created_time: 7384,
        status: MessageStatus::New,
        r#type: MessageType::RequestFieldChange,
    };

    TestSyncIncomingRecord {
        translated_record: PullTranslateResult::upsert(row),
        sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
            r.table_name = TABLE_NAME.to_string();
            r.record_id = MESSAGE_1.0.to_string();
            r.data = MESSAGE_1.1.to_string();
        }),
        extra_data: None,
    }
}

pub fn test_pull_upsert() -> LegacyMessageRow {
    serde_json::from_str(&MESSAGE_1.1).unwrap()
}

pub fn test_pull_delete() -> LegacyMessageRow {
    serde_json::from_str(&MESSAGE_1.1).unwrap()
}
