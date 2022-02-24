use repository::schema::{RemoteSyncBufferAction, RemoteSyncBufferRow, StocktakeLineRow};

use crate::sync::translation_remote::{
    pull::{IntegrationRecord, IntegrationUpsertRecord},
    test_data::TestSyncRecord,
    TRANSLATION_RECORD_STOCKTAKE_LINE,
};

const STOCKTAKE_LINE_1: (&'static str, &'static str) = (
    "0a3de900f0d211eb8dddb54df6d741bc",
    r#"{
      "Batch": "stocktake_1",
      "Colour": 0,
      "ID": "0a3de900f0d211eb8dddb54df6d741bc",
      "comment": "",
      "cost_price": 7,
      "donor_ID": "",
      "expiry": "0000-00-00",
      "is_edited": true,
      "item_ID": "item_a",
      "item_line_ID": "item_a_line_a",
      "line_number": 1,
      "location_id": "",
      "optionID": "",
      "sell_price": 10,
      "snapshot_packsize": 1,
      "snapshot_qty": 0,
      "spare": 0,
      "stock_take_ID": "stocktake_a",
      "stock_take_qty": 700,
      "vaccine_vial_monitor_status_ID": ""
    }"#,
);

#[allow(dead_code)]
pub fn get_test_stocktake_line_records() -> Vec<TestSyncRecord> {
    vec![TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::StocktakeLine(StocktakeLineRow {
                id: STOCKTAKE_LINE_1.0.to_string(),
                stocktake_id: "stocktake_a".to_string(),
                stock_line_id: Some("item_a_line_a".to_string()),
                location_id: None,
                comment: None,
                snapshot_number_of_packs: 0,
                counted_number_of_packs: Some(700),
                item_id: "item_a".to_string(),
                batch: Some("stocktake_1".to_string()),
                expiry_date: None,
                pack_size: Some(1),
                cost_price_per_pack: Some(7.0),
                sell_price_per_pack: Some(10.0),
                note: None,
            }),
        )),
        identifier: "Stocktake 1",
        remote_sync_buffer_row: RemoteSyncBufferRow {
            id: "Stocktake_line_10".to_string(),
            table_name: TRANSLATION_RECORD_STOCKTAKE_LINE.to_string(),
            record_id: STOCKTAKE_LINE_1.0.to_string(),
            data: STOCKTAKE_LINE_1.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }]
}
