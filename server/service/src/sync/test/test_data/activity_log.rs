use crate::sync::{
    test::{TestSyncPullRecord, TestSyncPushRecord},
    translations::{activity_log::LegacyActivityLogRow, LegacyTableName, PullUpsertRecord},
};
use chrono::NaiveDate;
use repository::{ActivityLogRow, ActivityLogType};
use serde_json::json;

const ACTIVITY_LOG_1: (&'static str, &'static str) = (
    "log_d",
    r#"{
    "ID": "log_d",
    "type": "InvoiceCreated",
    "user_ID": "user_account_a",
    "store_ID": "store_b",
    "record_ID": "outbound_shipment_a",
    "datetime": "2020-01-01T00:00:00",
    "event": ""
    }"#,
);

const ACTIVITY_LOG_2: (&'static str, &'static str) = (
    "log_e",
    r#"{
    "ID": "log_e",
    "type": "InvoiceStatusAllocated",
    "user_ID": "user_account_a",
    "store_ID": "store_b",
    "record_ID": "inbound_shipment_a",
    "datetime": "2020-01-01T00:00:00",
    "event": ""
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::OM_ACTIVITY_LOG,
            ACTIVITY_LOG_1,
            PullUpsertRecord::ActivityLog(ActivityLogRow {
                id: ACTIVITY_LOG_1.0.to_string(),
                r#type: ActivityLogType::InvoiceCreated,
                user_id: Some("user_account_a".to_string()),
                store_id: Some("store_b".to_string()),
                record_id: Some("outbound_shipment_a".to_string()),
                datetime: NaiveDate::from_ymd_opt(2020, 1, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
                event: None,
            }),
        ),
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::OM_ACTIVITY_LOG,
            ACTIVITY_LOG_2,
            PullUpsertRecord::ActivityLog(ActivityLogRow {
                id: ACTIVITY_LOG_2.0.to_string(),
                r#type: ActivityLogType::InvoiceStatusAllocated,
                user_id: Some("user_account_a".to_string()),
                store_id: Some("store_b".to_string()),
                record_id: Some("inbound_shipment_a".to_string()),
                datetime: NaiveDate::from_ymd_opt(2020, 1, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
                event: None,
            }),
        ),
    ]
}

pub(crate) fn test_push_records() -> Vec<TestSyncPushRecord> {
    vec![
        TestSyncPushRecord {
            record_id: ACTIVITY_LOG_1.0.to_string(),
            table_name: LegacyTableName::OM_ACTIVITY_LOG.to_string(),
            push_data: json!(LegacyActivityLogRow {
                id: ACTIVITY_LOG_1.0.to_string(),
                r#type: ActivityLogType::InvoiceCreated,
                user_id: "user_account_a".to_string(),
                store_id: "store_b".to_string(),
                record_id: "outbound_shipment_a".to_string(),
                datetime: NaiveDate::from_ymd_opt(2020, 1, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
                event: None,
            }),
        },
        TestSyncPushRecord {
            record_id: ACTIVITY_LOG_2.0.to_string(),
            table_name: LegacyTableName::OM_ACTIVITY_LOG.to_string(),
            push_data: json!(LegacyActivityLogRow {
                id: ACTIVITY_LOG_2.0.to_string(),
                r#type: ActivityLogType::InvoiceStatusAllocated,
                user_id: "user_account_a".to_string(),
                store_id: "store_b".to_string(),
                record_id: "inbound_shipment_a".to_string(),
                datetime: NaiveDate::from_ymd_opt(2020, 1, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap(),
                event: None,
            }),
        },
    ]
}
