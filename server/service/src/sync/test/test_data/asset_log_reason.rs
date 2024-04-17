use repository::{asset_log_reason_row::AssetLogReasonRow, asset_log_row::AssetLogStatus};
use serde_json::json;
use util::Defaults;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &'static str = "asset_log_reason";

const ASSET_LOG_REASON1: (&'static str, &'static str) = (
    "42577e2f-2ede-461f-80cd-6a3b86f48b5e",
    r#"{
        "id": "42577e2f-2ede-461f-80cd-6a3b86f48b5e",
        "asset_log_status": "FUNCTIONING",
        "reason": "test_reason",
        "deleted_datetime": null   
    }"#,
);

const ASSET_LOG_REASON2: (&'static str, &'static str) = (
    "e87d728f-14bd-4ac8-9b9b-5ef00283b60f",
    r#"{
        "id": "e87d728f-14bd-4ac8-9b9b-5ef00283b60f",
        "asset_log_status": "FUNCTIONING",
        "reason": "test_reason_for_deleted",
        "deleted_datetime": "2020-01-22T15:16:00"
    }"#,
);

fn asset_log_reason1() -> AssetLogReasonRow {
    AssetLogReasonRow {
        id: ASSET_LOG_REASON1.0.to_string(),
        asset_log_status: AssetLogStatus::Functioning,
        reason: "test_reason".to_string(),
        deleted_datetime: None,
    }
}

fn asset_log_reason2() -> AssetLogReasonRow {
    AssetLogReasonRow {
        id: ASSET_LOG_REASON2.0.to_string(),
        asset_log_status: AssetLogStatus::Functioning,
        reason: "test_reason_for_deleted".to_string(),
        deleted_datetime: Some(Defaults::naive_date_time()),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(TABLE_NAME, ASSET_LOG_REASON1, asset_log_reason1()),
        TestSyncIncomingRecord::new_pull_upsert(TABLE_NAME, ASSET_LOG_REASON2, asset_log_reason2()),
    ]
}

pub(crate) fn test_v6_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        TestSyncOutgoingRecord {
            table_name: TABLE_NAME.to_string(),
            record_id: ASSET_LOG_REASON1.0.to_string(),
            push_data: json!(asset_log_reason1()),
        },
        TestSyncOutgoingRecord {
            table_name: TABLE_NAME.to_string(),
            record_id: ASSET_LOG_REASON2.0.to_string(),
            push_data: json!(asset_log_reason2()),
        },
    ]
}
