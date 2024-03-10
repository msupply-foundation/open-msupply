use chrono::NaiveDate;
use repository::StockLineRow;
use serde_json::json;

use crate::sync::{test::TestSyncPullRecord, translations::stock_line::LegacyStockLineRow};

use super::TestSyncPushRecord;

const TABLE_NAME: &'static str = "item_line";

const ITEM_LINE_1: (&'static str, &'static str) = (
    "0a3b02d0f0d211eb8dddb54df6d741bc",
    r#"{
      "ID": "0a3b02d0f0d211eb8dddb54df6d741bc",
      "available": 694,
      "barcodeID": "",
      "batch": "stocktake_1",
      "cost_price": 5,
      "donor_id": "",
      "expiry_date": "2022-02-17",
      "extraData": null,
      "hold": false,
      "initial_quan": 0,
      "item_ID": "item_a",
      "kit_data": null,
      "location_ID": "",
      "manufacturer_ID": "",
      "name_ID": "name_store_b",
      "note": "test note",
      "pack_inners_per_outer": 0,
      "pack_quan_per_inner": 0,
      "pack_size": 1,
      "quantity": 694,
      "sell_price": 10.0,
      "spare": 0,
      "spare_start_year_quan_tot": 0,
      "stock_on_hand_tot": 694,
      "store_ID": "store_a",
      "total_cost": 0,
      "total_volume": 0,
      "user_1": "",
      "user_2": "",
      "user_3": "",
      "user_4": "",
      "user_5_ID": "",
      "user_6_ID": "",
      "user_7_ID": "",
      "user_8_ID": "",
      "volume_per_pack": 0,
      "vvm_status": "",
      "weight_per_pack": 0
    }"#,
);
fn item_line_1_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        ITEM_LINE_1,
        StockLineRow {
            id: ITEM_LINE_1.0.to_string(),
            store_id: "store_a".to_string(),
            item_link_id: "item_a".to_string(),
            location_id: None,
            batch: Some("stocktake_1".to_string()),
            pack_size: 1,
            cost_price_per_pack: 5.0,
            sell_price_per_pack: 10.0,
            available_number_of_packs: 694.0,
            total_number_of_packs: 694.0,
            expiry_date: Some(NaiveDate::from_ymd_opt(2022, 2, 17).unwrap()),
            on_hold: false,
            note: Some("test note".to_string()),
            supplier_link_id: Some("name_store_b".to_string()),
            barcode_id: None,
        },
    )
}
fn item_line_1_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: ITEM_LINE_1.0.to_string(),
        push_data: json!(LegacyStockLineRow {
            ID: ITEM_LINE_1.0.to_string(),
            store_ID: "store_a".to_string(),
            item_ID: "item_a".to_string(),
            batch: Some("stocktake_1".to_string()),
            expiry_date: Some(NaiveDate::from_ymd_opt(2022, 2, 17).unwrap()),
            hold: false,
            location_ID: None,
            pack_size: 1,
            available: 694.0,
            quantity: 694.0,
            cost_price: 5.0,
            sell_price: 10.0,
            note: Some("test note".to_string()),
            supplier_id: Some("name_store_b".to_string()),
            barcode_id: None,
        }),
    }
}

const ITEM_LINE_2: (&'static str, &'static str) = (
    "4E8AAB798EBA42819E24CC753C800242",
    r#"{
      "ID": "4E8AAB798EBA42819E24CC753C800242",
      "available": 1000,
      "barcodeID": "",
      "batch": "none",
      "cost_price": 0,
      "donor_id": "",
      "expiry_date": "0000-00-00",
      "extraData": null,
      "hold": false,
      "initial_quan": 0,
      "item_ID": "item_b",
      "kit_data": null,
      "location_ID": "",
      "manufacturer_ID": "",
      "name_ID": "",
      "note": "",
      "pack_inners_per_outer": 0,
      "pack_quan_per_inner": 0,
      "pack_size": 1,
      "quantity": 1001,
      "sell_price": 0,
      "spare": 0,
      "spare_start_year_quan_tot": 0,
      "stock_on_hand_tot": 1000,
      "store_ID": "store_a",
      "total_cost": 0.0,
      "total_volume": 0.0,
      "user_1": "",
      "user_2": "",
      "user_3": "",
      "user_4": "",
      "user_5_ID": "",
      "user_6_ID": "",
      "user_7_ID": "",
      "user_8_ID": "",
      "volume_per_pack": 0,
      "vvm_status": "",
      "weight_per_pack": 0
  }"#,
);
fn item_line_2_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        ITEM_LINE_2,
        StockLineRow {
            id: ITEM_LINE_2.0.to_string(),
            store_id: "store_a".to_string(),
            item_link_id: "item_b".to_string(),
            location_id: None,
            batch: Some("none".to_string()),
            pack_size: 1,
            cost_price_per_pack: 0.0,
            sell_price_per_pack: 0.0,
            available_number_of_packs: 1000.0,
            total_number_of_packs: 1001.0,
            expiry_date: None,
            on_hold: false,
            note: None,
            supplier_link_id: None,
            barcode_id: None,
        },
    )
}
fn item_line_2_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: ITEM_LINE_2.0.to_string(),
        push_data: json!(LegacyStockLineRow {
            ID: ITEM_LINE_2.0.to_string(),
            store_ID: "store_a".to_string(),
            item_ID: "item_b".to_string(),
            batch: Some("none".to_string()),
            expiry_date: None,
            hold: false,
            location_ID: None,
            pack_size: 1,
            available: 1000.0,
            quantity: 1001.0,
            cost_price: 0.0,
            sell_price: 0.0,
            note: None,
            supplier_id: None,
            barcode_id: None,
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![item_line_1_pull_record(), item_line_2_pull_record()]
}

pub(crate) fn test_push_records() -> Vec<TestSyncPushRecord> {
    vec![item_line_1_push_record(), item_line_2_push_record()]
}
