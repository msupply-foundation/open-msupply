use repository::{asset_log_row::AssetLogStatus, db_diesel::assets::asset_log_row::AssetLogRow};
use serde_json::json;
use util::Defaults;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &'static str = "asset_log";

const ASSET_LOG1: (&'static str, &'static str) = (
    "9d362696-e6e9-4fd7-ac23-7600d7389ba0",
    r#"{
        "id": "9d362696-e6e9-4fd7-ac23-7600d7389ba0",
        "asset_id": "3de161ed-93ef-4210-aa31-3ae9e53748e8",
        "user_id": "user_account_a",
        "status": "FUNCTIONING",
        "comment": "test_comment",
        "reason": "AWAITING_INSTALLATION",
        "log_datetime": "2020-01-22T15:16:00"   
    }"#,
);

fn asset_log1() -> AssetLogRow {
    AssetLogRow {
        id: ASSET_LOG1.0.to_string(),
        asset_id: "3de161ed-93ef-4210-aa31-3ae9e53748e8".to_string(),
        user_id: "user_account_a".to_string(), // Mock user account
        status: Some(AssetLogStatus::Functioning),
        comment: Some("test_comment".to_string()),
        reason_id: None,
        log_datetime: Defaults::naive_date_time(),
        r#type: None,
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        ASSET_LOG1,
        asset_log1(),
    )]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: ASSET_LOG1.0.to_string(),
        push_data: json!(asset_log1()),
    }]
}
