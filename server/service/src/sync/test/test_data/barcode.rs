use crate::sync::{
    test::{TestSyncPullRecord, TestSyncPushRecord},
    translations::{activity_log::LegacyActivityLogRow, LegacyTableName, PullUpsertRecord},
};
use chrono::NaiveDate;
use repository::{ActivityLogRow, ActivityLogType};
use serde_json::json;

const BARCODE_1: (&'static str, &'static str) = (
    "barcode_a",
    r#"{
    "ID": "barcode_a",
    "barcode": "0123456789",
    "itemID": "item_a",
    "manufacturerID": "manufacturer_a",
    "packSize": "1",
    "parentID": "",
    }"#,
);

const BARCODE_2: (&'static str, &'static str) = (
    "barcode_b",
    r#"{
    "ID": "barcode_b",
    "barcode": "9876543210",
    "itemID": "item_b",
    "manufacturerID": "manufacturer_a",
    "packSize": "1",
    "parentID": "",
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::BARCODE,
            BARCODE_1,
            PullUpsertRecord::ActivityLog(BarcodeRow {
                id: BARCODE_1.0.to_string(),
                barcode: "0123456789".to_string(),
                item_id: Some("item_a".to_string()),
                manufacturer_id: Some("manufacturer_a".to_string()),
                pack_size: Some(1),
                parent_id: None,
            }),
        ),
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::BARCODE,
            BARCODE_2,
            PullUpsertRecord::ActivityLog(BarcodeRow {
                id: BARCODE_1.0.to_string(),
                barcode: "9876543210".to_string(),
                item_id: Some("item_b".to_string()),
                manufacturer_id: Some("manufacturer_a".to_string()),
                pack_size: Some(1),
                parent_id: None,
            }),
        ),
    ]
}

pub(crate) fn test_push_records() -> Vec<TestSyncPushRecord> {
    vec![
        TestSyncPushRecord {
            record_id: BARCODE_1.0.to_string(),
            table_name: LegacyTableName::BARCODE.to_string(),
            push_data: json!(BarcodeRow {
                id: BARCODE_1.0.to_string(),
                barcode: "0123456789".to_string(),
                item_id: Some("item_a".to_string()),
                manufacturer_id: Some("manufacturer_a".to_string()),
                pack_size: Some(1),
                parent_id: None,
            }),
        },
        TestSyncPushRecord {
            record_id: BARCODE_2.0.to_string(),
            table_name: LegacyTableName::BARCODE.to_string(),
            push_data: json!(BarcodeRow {
                id: BARCODE_2.0.to_string(),
                barcode: "9876543210".to_string(),
                item_id: Some("item_b".to_string()),
                manufacturer_id: Some("manufacturer_a".to_string()),
                pack_size: Some(1),
                parent_id: None,
            }),
        },
    ]
}
