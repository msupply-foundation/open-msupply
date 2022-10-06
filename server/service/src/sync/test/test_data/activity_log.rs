use crate::sync::{
    test::{TestSyncPullRecord, TestSyncPushRecord},
    translations::{
        activity_log::{LegacyActivityLogRow, LegacyActivityLogType},
        LegacyTableName, PullUpsertRecord,
    },
};
use chrono::NaiveDate;
use repository::{
    ActivityLogRow, ActivityLogType, ChangelogAction, ChangelogRow, ChangelogTableName,
};
use serde_json::json;
use util::inline_init;

const ACTIVITY_LOG_1: (&'static str, &'static str) = (
    "log_a",
    r#"{
    "ID": "log_a",
    "type": "user_logged_in",
    "user_ID": "user_account_a",
    "store_ID": "",
    "record_ID": "",
    "datetime": "2020-01-01T00:00:00"
    }"#,
);

const ACTIVITY_LOG_2: (&'static str, &'static str) = (
    "log_b",
    r#"{
    "ID": "log_b",
    "type": "invoice_created",
    "user_ID": "user_account_a",
    "store_ID": "store_a",
    "record_ID": "outbound_shipment_a",
    "datetime": "2020-01-01T00:00:00"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::OM_ACTIVITY_LOG,
            ACTIVITY_LOG_1,
            PullUpsertRecord::ActivityLog(ActivityLogRow {
                id: ACTIVITY_LOG_1.0.to_string(),
                r#type: ActivityLogType::UserLoggedIn,
                user_id: Some("user_account_a".to_string()),
                store_id: None,
                record_id: None,
                datetime: NaiveDate::from_ymd(2020, 1, 1).and_hms(0, 0, 0),
            }),
        ),
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::OM_ACTIVITY_LOG,
            ACTIVITY_LOG_2,
            PullUpsertRecord::ActivityLog(ActivityLogRow {
                id: ACTIVITY_LOG_2.0.to_string(),
                r#type: ActivityLogType::InvoiceCreated,
                user_id: Some("user_account_a".to_string()),
                store_id: Some("store_a".to_string()),
                record_id: Some("outbound_shipment_a".to_string()),
                datetime: NaiveDate::from_ymd(2020, 1, 1).and_hms(0, 0, 0),
            }),
        ),
    ]
}

pub(crate) fn test_push_records() -> Vec<TestSyncPushRecord> {
    vec![
        TestSyncPushRecord {
            change_log: inline_init(|r: &mut ChangelogRow| {
                r.cursor = 2;
                r.table_name = ChangelogTableName::ActivityLog;
                r.record_id = ACTIVITY_LOG_1.0.to_string();
                r.row_action = ChangelogAction::Upsert;
            }),
            push_data: json!(LegacyActivityLogRow {
                ID: ACTIVITY_LOG_1.0.to_string(),
                r#type: LegacyActivityLogType::UserLoggedIn,
                user_ID: Some("user_account_a".to_string()),
                store_ID: None,
                record_ID: None,
                datetime: NaiveDate::from_ymd(2020, 1, 1).and_hms(0, 0, 0),
            }),
        },
        TestSyncPushRecord {
            change_log: inline_init(|r: &mut ChangelogRow| {
                r.cursor = 2;
                r.table_name = ChangelogTableName::ActivityLog;
                r.record_id = ACTIVITY_LOG_2.0.to_string();
                r.row_action = ChangelogAction::Upsert;
            }),
            push_data: json!(LegacyActivityLogRow {
                ID: ACTIVITY_LOG_2.0.to_string(),
                r#type: LegacyActivityLogType::InvoiceCreated,
                user_ID: Some("user_account_a".to_string()),
                store_ID: Some("store_a".to_string()),
                record_ID: Some("outbound_shipment_a".to_string()),
                datetime: NaiveDate::from_ymd(2020, 1, 1).and_hms(0, 0, 0),
            }),
        },
    ]
}
