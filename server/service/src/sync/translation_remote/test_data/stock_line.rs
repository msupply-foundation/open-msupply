use chrono::NaiveDate;
use repository::{
    ChangelogAction, ChangelogRow, ChangelogTableName, RemoteSyncBufferAction, RemoteSyncBufferRow,
    StockLineRow,
};
use serde_json::json;

use crate::sync::translation_remote::{
    pull::{IntegrationRecord, IntegrationUpsertRecord},
    stock_line::LegacyStockLineRow,
    test_data::TestSyncRecord,
    TRANSLATION_RECORD_ITEM_LINE,
};

use super::TestSyncPushRecord;

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
      "name_ID": "name_store_a",
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
fn item_line_1_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::StockLine(StockLineRow {
                id: ITEM_LINE_1.0.to_string(),
                store_id: "store_a".to_string(),
                item_id: "item_a".to_string(),
                location_id: None,
                batch: Some("stocktake_1".to_string()),
                pack_size: 1,
                cost_price_per_pack: 5.0,
                sell_price_per_pack: 10.0,
                available_number_of_packs: 694,
                total_number_of_packs: 694,
                expiry_date: Some(NaiveDate::from_ymd(2022, 2, 17)),
                on_hold: false,
                note: Some("test note".to_string()),
            }),
        )),
        identifier: "Stock line 1",
        remote_sync_buffer_row: RemoteSyncBufferRow {
            id: "Stock_line_10".to_string(),
            table_name: TRANSLATION_RECORD_ITEM_LINE.to_string(),
            record_id: ITEM_LINE_1.0.to_string(),
            data: ITEM_LINE_1.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}
fn item_line_1_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::StockLine,
            row_id: ITEM_LINE_1.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyStockLineRow {
            ID: ITEM_LINE_1.0.to_string(),
            store_ID: "store_a".to_string(),
            item_ID: "item_a".to_string(),
            batch: Some("stocktake_1".to_string()),
            expiry_date: Some(NaiveDate::from_ymd(2022, 2, 17)),
            hold: false,
            location_ID: None,
            pack_size: 1,
            available: 694,
            quantity: 694,
            cost_price: 5.0,
            sell_price: 10.0,
            note: Some("test note".to_string())
        }),
    }
}

const ITEM_LINE_2: (&'static str, &'static str) = (
    "4E8AAB798EBA42819E24CC753C800242",
    r#"{
      "ID": "4E8AAB798EBA42819E24CC753C800242",
      "available": -1000,
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
      "quantity": -1001,
      "sell_price": 0,
      "spare": 0,
      "spare_start_year_quan_tot": 0,
      "stock_on_hand_tot": -1000,
      "store_ID": "store_a",
      "total_cost": -0.0,
      "total_volume": -0.0,
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
fn item_line_2_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::StockLine(StockLineRow {
                id: ITEM_LINE_2.0.to_string(),
                store_id: "store_a".to_string(),
                item_id: "item_b".to_string(),
                location_id: None,
                batch: Some("none".to_string()),
                pack_size: 1,
                cost_price_per_pack: 0.0,
                sell_price_per_pack: 0.0,
                available_number_of_packs: -1000,
                total_number_of_packs: -1001,
                expiry_date: None,
                on_hold: false,
                note: Some("".to_string()),
            }),
        )),
        identifier: "Stock line 2",
        remote_sync_buffer_row: RemoteSyncBufferRow {
            id: "Stock_line_20".to_string(),
            table_name: TRANSLATION_RECORD_ITEM_LINE.to_string(),
            record_id: ITEM_LINE_2.0.to_string(),
            data: ITEM_LINE_2.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}
fn item_line_2_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::StockLine,
            row_id: ITEM_LINE_2.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyStockLineRow {
            ID: ITEM_LINE_2.0.to_string(),
            store_ID: "store_a".to_string(),
            item_ID: "item_b".to_string(),
            batch: Some("none".to_string()),
            expiry_date: None,
            hold: false,
            location_ID: None,
            pack_size: 1,
            available: -1000,
            quantity: -1001,
            cost_price: 0.0,
            sell_price: 0.0,
            note: Some("".to_string())
        }),
    }
}

#[allow(dead_code)]
pub fn get_test_stock_line_records() -> Vec<TestSyncRecord> {
    vec![item_line_1_pull_record(), item_line_2_pull_record()]
}

#[allow(dead_code)]
pub fn get_test_push_stock_line_records() -> Vec<TestSyncPushRecord> {
    vec![item_line_1_push_record(), item_line_2_push_record()]
}
