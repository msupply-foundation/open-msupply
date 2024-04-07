use super::TestSyncOutgoingRecord;
use crate::sync::{
    test::TestSyncIncomingRecord, translations::stocktake_line::LegacyStocktakeLineRow,
};
use repository::StocktakeLineRow;
use serde_json::json;

const TABLE_NAME: &str = "Stock_take_lines";

const STOCKTAKE_LINE_1: (&str, &str) = (
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
fn stocktake_line_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        STOCKTAKE_LINE_1,
        StocktakeLineRow {
            id: STOCKTAKE_LINE_1.0.to_string(),
            stocktake_id: "stocktake_a".to_string(),
            stock_line_id: Some("item_c_line_a".to_string()),
            location_id: None,
            comment: None,
            snapshot_number_of_packs: 10.0,
            counted_number_of_packs: Some(700.0),
            item_link_id: "item_a".to_string(),
            batch: Some("item_c_batch_a".to_string()),
            expiry_date: None,
            pack_size: Some(1),
            cost_price_per_pack: Some(12.0),
            sell_price_per_pack: Some(15.0),
            note: None,
            inventory_adjustment_reason_id: None,
        },
    )
}
fn stocktake_line_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: STOCKTAKE_LINE_1.0.to_string(),
        push_data: json!(LegacyStocktakeLineRow {
            ID: STOCKTAKE_LINE_1.0.to_string(),
            stock_take_ID: "stocktake_a".to_string(),
            location_id: None,
            comment: None,
            snapshot_qty: 10.0,
            snapshot_packsize: 1,
            stock_take_qty: 700.0,
            is_edited: true,
            item_line_ID: Some("item_c_line_a".to_string()),
            item_ID: "item_a".to_string(),
            Batch: Some("item_c_batch_a".to_string()),
            expiry: None,
            cost_price: 12.0,
            sell_price: 15.0,
            note: None,
            inventory_adjustment_reason_id: None,
        }),
    }
}

const STOCKTAKE_LINE_OM_FIELDS: (&str, &str) = (
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
fn stocktake_line_om_field_pull_record() -> TestSyncIncomingRecord {
    TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        STOCKTAKE_LINE_OM_FIELDS,
        StocktakeLineRow {
            id: STOCKTAKE_LINE_OM_FIELDS.0.to_string(),
            stocktake_id: "stocktake_a".to_string(),
            stock_line_id: Some("item_c_line_a".to_string()),
            location_id: None,
            comment: None,
            snapshot_number_of_packs: 10.0,
            counted_number_of_packs: Some(700.0),
            item_link_id: "item_a".to_string(),
            batch: Some("item_c_batch_a".to_string()),
            expiry_date: None,
            pack_size: Some(1),
            cost_price_per_pack: Some(12.0),
            sell_price_per_pack: Some(15.0),
            note: Some("om note".to_string()),
            inventory_adjustment_reason_id: None,
        },
    )
}
fn stocktake_line_om_field_push_record() -> TestSyncOutgoingRecord {
    TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: STOCKTAKE_LINE_OM_FIELDS.0.to_string(),
        push_data: json!(LegacyStocktakeLineRow {
            ID: STOCKTAKE_LINE_OM_FIELDS.0.to_string(),
            stock_take_ID: "stocktake_a".to_string(),
            location_id: None,
            comment: None,
            snapshot_qty: 10.0,
            snapshot_packsize: 1,
            stock_take_qty: 700.0,
            is_edited: true,
            item_line_ID: Some("item_c_line_a".to_string()),
            item_ID: "item_a".to_string(),
            Batch: Some("item_c_batch_a".to_string()),
            expiry: None,
            cost_price: 12.0,
            sell_price: 15.0,
            note: Some("om note".to_string()),
            inventory_adjustment_reason_id: None,
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        stocktake_line_pull_record(),
        stocktake_line_om_field_pull_record(),
    ]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![
        stocktake_line_push_record(),
        stocktake_line_om_field_push_record(),
    ]
}
