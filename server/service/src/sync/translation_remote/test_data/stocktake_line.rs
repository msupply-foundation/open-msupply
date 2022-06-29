use repository::{
    ChangelogAction, ChangelogRow, ChangelogTableName, StocktakeLineRow, SyncBufferRow,
};
use serde_json::json;
use util::inline_init;

use crate::sync::translation_remote::{
    pull::{IntegrationRecord, IntegrationUpsertRecord},
    stocktake_line::LegacyStocktakeLineRow,
    test_data::TestSyncRecord,
    TRANSLATION_RECORD_STOCKTAKE_LINE,
};

use super::TestSyncPushRecord;

const STOCKTAKE_LINE_1: (&'static str, &'static str) = (
    "0a3de900f0d211eb8dddb54df6d741bc",
    r#"{
      "Batch": "item_c_batch_a",
      "Colour": 0,
      "ID": "0a3de900f0d211eb8dddb54df6d741bc",
      "comment": "",
      "cost_price": 12,
      "donor_ID": "",
      "expiry": "0000-00-00",
      "is_edited": true,
      "item_ID": "item_a",
      "item_line_ID": "item_c_line_a",
      "line_number": 1,
      "location_id": "",
      "optionID": "",
      "sell_price": 15,
      "snapshot_packsize": 1,
      "snapshot_qty": 10,
      "spare": 0,
      "stock_take_ID": "stocktake_a",
      "stock_take_qty": 700,
      "vaccine_vial_monitor_status_ID": ""
    }"#,
);
fn stocktake_line_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::StocktakeLine(StocktakeLineRow {
                id: STOCKTAKE_LINE_1.0.to_string(),
                stocktake_id: "stocktake_a".to_string(),
                stock_line_id: Some("item_c_line_a".to_string()),
                location_id: None,
                comment: None,
                snapshot_number_of_packs: 10,
                counted_number_of_packs: Some(700),
                item_id: "item_a".to_string(),
                batch: Some("item_c_batch_a".to_string()),
                expiry_date: None,
                pack_size: Some(1),
                cost_price_per_pack: Some(12.0),
                sell_price_per_pack: Some(15.0),
                note: None,
            }),
        )),
        identifier: "Stocktake 1",
        remote_sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
            r.table_name = TRANSLATION_RECORD_STOCKTAKE_LINE.to_string();
            r.record_id = STOCKTAKE_LINE_1.0.to_string();
            r.data = STOCKTAKE_LINE_1.1.to_string();
        }),
    }
}
fn stocktake_line_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::StocktakeLine,
            row_id: STOCKTAKE_LINE_1.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyStocktakeLineRow {
            ID: STOCKTAKE_LINE_1.0.to_string(),
            stock_take_ID: "stocktake_a".to_string(),
            location_id: None,
            comment: None,
            snapshot_qty: 10,
            snapshot_packsize: 1,
            stock_take_qty: 700,
            is_edited: true,
            item_line_ID: Some("item_c_line_a".to_string()),
            item_ID: "item_a".to_string(),
            Batch: Some("item_c_batch_a".to_string()),
            expiry: None,
            cost_price: 12.0,
            sell_price: 15.0,
            note: None,
        }),
    }
}

const STOCKTAKE_LINE_OM_FIELDS: (&'static str, &'static str) = (
    "0a3de900f0d211eb8dddb54df6d741b1",
    r#"{
      "Batch": "item_c_batch_a",
      "Colour": 0,
      "ID": "0a3de900f0d211eb8dddb54df6d741b1",
      "comment": "",
      "cost_price": 12,
      "donor_ID": "",
      "expiry": "0000-00-00",
      "is_edited": true,
      "item_ID": "item_a",
      "item_line_ID": "item_c_line_a",
      "line_number": 1,
      "location_id": "",
      "optionID": "",
      "sell_price": 15,
      "snapshot_packsize": 1,
      "snapshot_qty": 10,
      "spare": 0,
      "stock_take_ID": "stocktake_a",
      "stock_take_qty": 700,
      "vaccine_vial_monitor_status_ID": "",
      "om_note": "om note"
    }"#,
);
fn stocktake_line_om_field_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::StocktakeLine(StocktakeLineRow {
                id: STOCKTAKE_LINE_OM_FIELDS.0.to_string(),
                stocktake_id: "stocktake_a".to_string(),
                stock_line_id: Some("item_c_line_a".to_string()),
                location_id: None,
                comment: None,
                snapshot_number_of_packs: 10,
                counted_number_of_packs: Some(700),
                item_id: "item_a".to_string(),
                batch: Some("item_c_batch_a".to_string()),
                expiry_date: None,
                pack_size: Some(1),
                cost_price_per_pack: Some(12.0),
                sell_price_per_pack: Some(15.0),
                note: Some("om note".to_string()),
            }),
        )),
        identifier: "Stocktake om field",
        remote_sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
            r.table_name = TRANSLATION_RECORD_STOCKTAKE_LINE.to_string();
            r.record_id = STOCKTAKE_LINE_OM_FIELDS.0.to_string();
            r.data = STOCKTAKE_LINE_OM_FIELDS.1.to_string();
        }),
    }
}
fn stocktake_line_om_field_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::StocktakeLine,
            row_id: STOCKTAKE_LINE_OM_FIELDS.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyStocktakeLineRow {
            ID: STOCKTAKE_LINE_OM_FIELDS.0.to_string(),
            stock_take_ID: "stocktake_a".to_string(),
            location_id: None,
            comment: None,
            snapshot_qty: 10,
            snapshot_packsize: 1,
            stock_take_qty: 700,
            is_edited: true,
            item_line_ID: Some("item_c_line_a".to_string()),
            item_ID: "item_a".to_string(),
            Batch: Some("item_c_batch_a".to_string()),
            expiry: None,
            cost_price: 12.0,
            sell_price: 15.0,
            note: Some("om note".to_string()),
        }),
    }
}

#[allow(dead_code)]
pub fn get_test_stocktake_line_records() -> Vec<TestSyncRecord> {
    vec![
        stocktake_line_pull_record(),
        stocktake_line_om_field_pull_record(),
    ]
}

#[allow(dead_code)]
pub fn get_test_push_stocktake_line_records() -> Vec<TestSyncPushRecord> {
    vec![
        stocktake_line_push_record(),
        stocktake_line_om_field_push_record(),
    ]
}
