use repository::db_diesel::sync_file_reference_row::SyncFileReferenceRow;
use serde_json::json;
use util::Defaults;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "sync_file_reference";

const ASSET_LOG1: (&str, &str) = (
    "cf206829-d716-4b45-a14b-f06cda2d8e74",
    r#"{
        "id": "cf206829-d716-4b45-a14b-f06cda2d8e74",
        "table_name": "asset",
        "record_id": "3de161ed-93ef-4210-aa31-3ae9e53748e8",
        "file_name": "asset1.jpg",
        "mime_type": "image/jpeg",
        "created_datetime": "2020-01-22T15:16:00"   
    }"#,
);

fn sync_file_reference1() -> SyncFileReferenceRow {
    SyncFileReferenceRow {
        id: ASSET_LOG1.0.to_string(),
        table_name: "asset".to_string(),
        record_id: "3de161ed-93ef-4210-aa31-3ae9e53748e8".to_string(),
        file_name: "asset1.jpg".to_string(),
        mime_type: Some("image/jpeg".to_string()),
        uploaded_bytes: 0,
        total_bytes: 0,
        created_datetime: Defaults::naive_date_time(),
        deleted_datetime: None,
        ..Default::default()
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        ASSET_LOG1,
        sync_file_reference1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: ASSET_LOG1.0.to_string(),
        push_data: json!(sync_file_reference1()),
    }]
}
