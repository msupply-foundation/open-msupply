use crate::sync::{
    test::{TestSyncPullRecord, TestSyncPushRecord},
    translations::{barcode::LegacyBarcodeRow, LegacyTableName, PullUpsertRecord},
};

use repository::BarcodeRow;
use serde_json::json;

const BARCODE_1: (&'static str, &'static str) = (
    "barcode_a",
    r#"{
    "ID": "barcode_a",
    "barcode": "0123456789",
    "itemID": "item_a",
    "manufacturerID": "name_a",
    "packSize": 1
    }"#,
);

const BARCODE_2: (&'static str, &'static str) = (
    "barcode_b",
    r#"{
    "ID": "barcode_b",
    "barcode": "9876543210",
    "itemID": "item_b",
    "manufacturerID": "name_a",
    "packSize": 1
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::BARCODE,
            BARCODE_1,
            PullUpsertRecord::Barcode(BarcodeRow {
                id: BARCODE_1.0.to_string(),
                gtin: "0123456789".to_string(),
                item_id: "item_a".to_string(),
                manufacturer_link_id: Some("name_a".to_string()),
                pack_size: Some(1),
                parent_id: None,
            }),
        ),
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::BARCODE,
            BARCODE_2,
            PullUpsertRecord::Barcode(BarcodeRow {
                id: BARCODE_2.0.to_string(),
                gtin: "9876543210".to_string(),
                item_id: "item_b".to_string(),
                manufacturer_link_id: Some("name_a".to_string()),
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
            push_data: json!(LegacyBarcodeRow {
                id: BARCODE_1.0.to_string(),
                gtin: "0123456789".to_string(),
                item_id: "item_a".to_string(),
                manufacturer_id: Some("name_a".to_string()),
                pack_size: Some(1),
                parent_id: None,
            }),
        },
        TestSyncPushRecord {
            record_id: BARCODE_2.0.to_string(),
            table_name: LegacyTableName::BARCODE.to_string(),
            push_data: json!(LegacyBarcodeRow {
                id: BARCODE_2.0.to_string(),
                gtin: "9876543210".to_string(),
                item_id: "item_b".to_string(),
                manufacturer_id: Some("name_a".to_string()),
                pack_size: Some(1),
                parent_id: None,
            }),
        },
    ]
}
