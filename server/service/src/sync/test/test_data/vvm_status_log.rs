use repository::vvm_status::vvm_status_log_row::VVMStatusLogRow;

use chrono::{NaiveDate, NaiveTime};
use serde_json::json;

use crate::sync::{
    test::{TestSyncIncomingRecord, TestSyncOutgoingRecord},
    translations::vvm_status_log::LegacyVVMStatusLogRow,
};

const TABLE_NAME: &str = "vaccine_vial_monitor_status_log";

const VVM_STATUS_LOG_1: (&str, &str) = (
    "vvmsl62-7214-4a27-a93e-526ca89ecc35",
    r#"{
        "ID": "vvmsl62-7214-4a27-a93e-526ca89ecc35",
        "status_ID": "VVM_STATUS_1",
        "date": "2025-05-08", 
        "time": 36000,
        "item_line_ID": "0a3b02d0f0d211eb8dddb54df6d741bc",
        "comment": "Test comment 1",
        "user_ID": "user1",
        "trans_line_ID": "12ee2f10f0d211eb8dddb54df6d741bc",
        "store_ID": "store_a"
    }"#,
);

fn vvm_status_log_1_pull_record() -> TestSyncIncomingRecord {
    let created_datetime = NaiveDate::from_ymd_opt(2025, 5, 8)
        .unwrap()
        .and_time(NaiveTime::from_num_seconds_from_midnight_opt(36000, 0).unwrap());
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        VVM_STATUS_LOG_1,
        VVMStatusLogRow {
            id: VVM_STATUS_LOG_1.0.to_string(),
            status_id: "VVM_STATUS_1".to_string(),
            created_datetime,
            stock_line_id: "0a3b02d0f0d211eb8dddb54df6d741bc".to_string(),
            comment: Some("Test comment 1".to_string()),
            created_by: "user1".to_string(),
            invoice_line_id: Some("12ee2f10f0d211eb8dddb54df6d741bc".to_string()),
            store_id: "store_a".to_string(),
        },
    )
}

fn vvm_status_log_1_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: VVM_STATUS_LOG_1.0.to_string(),
        push_data: json!(LegacyVVMStatusLogRow {
            id: VVM_STATUS_LOG_1.0.to_string(),
            status_id: "VVM_STATUS_1".to_string(),
            date: NaiveDate::from_ymd_opt(2025, 5, 8).unwrap(),
            time: NaiveTime::from_num_seconds_from_midnight_opt(36000, 0).unwrap(),
            stock_line_id: "0a3b02d0f0d211eb8dddb54df6d741bc".to_string(),
            comment: Some("Test comment 1".to_string()),
            created_by: "user1".to_string(),
            invoice_line_id: Some("12ee2f10f0d211eb8dddb54df6d741bc".to_string()),
            store_id: "store_a".to_string(),
        }),
    }
}

const VVM_STATUS_LOG_2: (&str, &str) = (
    "vvmsl73-8325-5b38-b94f-637db90fdd46",
    r#"{
        "ID": "vvmsl73-8325-5b38-b94f-637db90fdd46",
        "status_ID": "VVM_STATUS_2",
        "date": "2025-01-01",
        "time": 36000,
        "item_line_ID": "item_b_line_a",
        "comment": "Test comment 2",
        "user_ID": "user1",
        "trans_line_ID": null,
        "store_ID": "store_a"
    }"#,
);

fn vvm_status_log_2_pull_record() -> TestSyncIncomingRecord {
    let created_datetime = NaiveDate::from_ymd_opt(2025, 1, 1)
        .unwrap()
        .and_time(NaiveTime::from_num_seconds_from_midnight_opt(36000, 0).unwrap());
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        VVM_STATUS_LOG_2,
        VVMStatusLogRow {
            id: VVM_STATUS_LOG_2.0.to_string(),
            status_id: "VVM_STATUS_2".to_string(),
            created_datetime,
            stock_line_id: "item_b_line_a".to_string(),
            comment: Some("Test comment 2".to_string()),
            created_by: "user1".to_string(),
            invoice_line_id: None,
            store_id: "store_a".to_string(),
        },
    )
}

fn vvm_status_log_2_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: VVM_STATUS_LOG_2.0.to_string(),
        push_data: json!(LegacyVVMStatusLogRow {
            id: VVM_STATUS_LOG_2.0.to_string(),
            status_id: "VVM_STATUS_2".to_string(),
            date: NaiveDate::from_ymd_opt(2025, 1, 1).unwrap(),
            time: NaiveTime::from_num_seconds_from_midnight_opt(36000, 0).unwrap(),
            stock_line_id: "item_b_line_a".to_string(),
            comment: Some("Test comment 2".to_string()),
            created_by: "user1".to_string(),
            invoice_line_id: None,
            store_id: "store_a".to_string(),
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        vvm_status_log_1_pull_record(),
        vvm_status_log_2_pull_record(),
    ]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        vvm_status_log_1_push_record(),
        vvm_status_log_2_push_record(),
    ]
}
