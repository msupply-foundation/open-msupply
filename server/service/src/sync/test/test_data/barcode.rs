use crate::sync::{
    test::{TestSyncIncomingRecord, TestSyncOutgoingRecord},
    translations::barcode::LegacyBarcodeRow,
};

use repository::BarcodeRow;
use serde_json::json;

const TABLE_NAME: &'static str = "barcode";

const BARCODE_1: (&'static str, &'static str) = (
    "barcode_a",
    r#"{
    "ID": "barcode_a",
    "barcode": "0123456789",
    "itemID": "item_a",
    "manufacturerID": "name_a",
    "packSize": 1,
    "parentID": ""
    }"#,
);

const BARCODE_2: (&'static str, &'static str) = (
    "barcode_b",
    r#"{
    "ID": "barcode_b",
    "barcode": "9876543210",
    "itemID": "item_b",
    "manufacturerID": "name_a",
    "packSize": 1,
    "parentID": ""
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            BARCODE_1,
            BarcodeRow {
                id: BARCODE_1.0.to_string(),
                gtin: "0123456789".to_string(),
                item_id: "item_a".to_string(),
                manufacturer_link_id: Some("name_a".to_string()),
                pack_size: Some(1),
                parent_id: None,
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            BARCODE_2,
            BarcodeRow {
                id: BARCODE_2.0.to_string(),
                gtin: "9876543210".to_string(),
                item_id: "item_b".to_string(),
                manufacturer_link_id: Some("name_a".to_string()),
                pack_size: Some(1),
                parent_id: None,
            },
        ),
    ]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        TestSyncOutgoingRecord {
            record_id: BARCODE_1.0.to_string(),
            table_name: TABLE_NAME.to_string(),
            push_data: json!(LegacyBarcodeRow {
                id: BARCODE_1.0.to_string(),
                gtin: "0123456789".to_string(),
                item_id: "item_a".to_string(),
                manufacturer_id: Some("name_a".to_string()),
                pack_size: Some(1),
                parent_id: None,
            }),
        },
        TestSyncOutgoingRecord {
            record_id: BARCODE_2.0.to_string(),
            table_name: TABLE_NAME.to_string(),
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
