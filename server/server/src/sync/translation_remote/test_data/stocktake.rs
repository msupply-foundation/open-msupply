use chrono::NaiveDate;
use repository::schema::{
    ChangelogAction, ChangelogRow, ChangelogTableName, RemoteSyncBufferAction, RemoteSyncBufferRow,
    StocktakeRow, StocktakeStatus,
};
use serde_json::json;

use crate::sync::translation_remote::{
    pull::{IntegrationRecord, IntegrationUpsertRecord},
    stocktake::{LegacyStocktakeRow, LegacyStocktakeStatus},
    test_data::TestSyncRecord,
    TRANSLATION_RECORD_STOCKTAKE,
};

use super::TestSyncPushRecord;

const STOCKTAKE_1: (&'static str, &'static str) = (
    "0a375950f0d211eb8dddb54df6d741bc",
    r#"{
      "Description": "Test",
      "ID": "0a375950f0d211eb8dddb54df6d741bc",
      "Locked": false,
      "comment": "",
      "created_by_ID": "",
      "finalised_by_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
      "invad_additions_ID": "inbound_shipment_a",
      "invad_reductions_ID": "",
      "programID": "",
      "serial_number": 3,
      "status": "fn",
      "stock_take_created_date": "2021-07-30",
      "stock_take_date": "2021-07-30",
      "stock_take_time": 47061,
      "store_ID": "store_a",
      "type": ""
    }"#,
);
fn stocktake_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Stocktake(StocktakeRow {
                id: STOCKTAKE_1.0.to_string(),
                user_id: "".to_string(),
                store_id: "store_a".to_string(),
                stocktake_number: 3,
                comment: None,
                description: Some("Test".to_string()),
                status: StocktakeStatus::Finalised,
                created_datetime: NaiveDate::from_ymd(2021, 07, 30).and_hms(0, 0, 0),
                finalised_datetime: None,
                inventory_adjustment_id: Some("inbound_shipment_a".to_string()),
                is_locked: false,
                stocktake_date: Some(NaiveDate::from_ymd(2021, 07, 30)),
            }),
        )),
        identifier: "Stocktake 1",
        remote_sync_buffer_row: RemoteSyncBufferRow {
            id: "Stocktake_10".to_string(),
            table_name: TRANSLATION_RECORD_STOCKTAKE.to_string(),
            record_id: STOCKTAKE_1.0.to_string(),
            data: STOCKTAKE_1.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}
fn stocktake_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::Stocktake,
            row_id: STOCKTAKE_1.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyStocktakeRow {
            ID: STOCKTAKE_1.0.to_string(),
            user_id: "".to_string(),
            store_ID: "store_a".to_string(),
            status: LegacyStocktakeStatus::Fn,
            Description: Some("Test".to_string()),
            comment: None,
            invad_additions_ID: Some("inbound_shipment_a".to_string()),
            serial_number: 3,
            stock_take_created_date: NaiveDate::from_ymd(2021, 07, 30),
            is_locked: false,
            stocktake_date: Some(NaiveDate::from_ymd(2021, 07, 30)),
            created_datetime: Some(NaiveDate::from_ymd(2021, 07, 30).and_hms(0, 0, 0)),
            finalised_datetime: None,
        }),
    }
}

const STOCKTAKE_OM_FIELD: (&'static str, &'static str) = (
    "Aa375950f0d211eb8dddb54df6d741bc",
    r#"{
      "Description": "Test",
      "ID": "Aa375950f0d211eb8dddb54df6d741bc",
      "Locked": false,
      "comment": "",
      "created_by_ID": "",
      "finalised_by_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
      "invad_additions_ID": "inbound_shipment_a",
      "invad_reductions_ID": "",
      "programID": "",
      "serial_number": 3,
      "status": "fn",
      "stock_take_created_date": "2021-07-30",
      "stock_take_date": "2021-07-30",
      "stock_take_time": 47061,
      "store_ID": "store_a",
      "type": "",
      "om_created_datetime": "2021-07-30T15:15:15",
      "om_finalised_datetime": "2021-07-31T15:15:15"
    }"#,
);
fn stocktake_om_field_pull_record() -> TestSyncRecord {
    TestSyncRecord {
        translated_record: Some(IntegrationRecord::from_upsert(
            IntegrationUpsertRecord::Stocktake(StocktakeRow {
                id: STOCKTAKE_OM_FIELD.0.to_string(),
                user_id: "".to_string(),
                store_id: "store_a".to_string(),
                stocktake_number: 3,
                comment: None,
                description: Some("Test".to_string()),
                status: StocktakeStatus::Finalised,
                created_datetime: NaiveDate::from_ymd(2021, 07, 30).and_hms(15, 15, 15),
                finalised_datetime: Some(NaiveDate::from_ymd(2021, 07, 31).and_hms(15, 15, 15)),
                inventory_adjustment_id: Some("inbound_shipment_a".to_string()),
                is_locked: false,
                stocktake_date: Some(NaiveDate::from_ymd(2021, 07, 30)),
            }),
        )),
        identifier: "Stocktake om field",
        remote_sync_buffer_row: RemoteSyncBufferRow {
            id: "Stocktake_20".to_string(),
            table_name: TRANSLATION_RECORD_STOCKTAKE.to_string(),
            record_id: STOCKTAKE_OM_FIELD.0.to_string(),
            data: STOCKTAKE_OM_FIELD.1.to_string(),
            action: RemoteSyncBufferAction::Update,
        },
    }
}
fn stocktake_om_field_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        change_log: ChangelogRow {
            id: 2,
            table_name: ChangelogTableName::Stocktake,
            row_id: STOCKTAKE_OM_FIELD.0.to_string(),
            row_action: ChangelogAction::Upsert,
        },
        push_data: json!(LegacyStocktakeRow {
            ID: STOCKTAKE_OM_FIELD.0.to_string(),
            user_id: "".to_string(),
            store_ID: "store_a".to_string(),
            status: LegacyStocktakeStatus::Fn,
            Description: Some("Test".to_string()),
            comment: None,
            invad_additions_ID: Some("inbound_shipment_a".to_string()),
            serial_number: 3,
            stock_take_created_date: NaiveDate::from_ymd(2021, 07, 30),
            is_locked: false,
            stocktake_date: Some(NaiveDate::from_ymd(2021, 07, 30)),
            created_datetime: Some(NaiveDate::from_ymd(2021, 07, 30).and_hms(15, 15, 15)),
            finalised_datetime: Some(NaiveDate::from_ymd(2021, 07, 31).and_hms(15, 15, 15)),
        }),
    }
}

#[allow(dead_code)]
pub fn get_test_stocktake_records() -> Vec<TestSyncRecord> {
    vec![stocktake_pull_record(), stocktake_om_field_pull_record()]
}

#[allow(dead_code)]
pub fn get_test_push_stocktake_records() -> Vec<TestSyncPushRecord> {
    vec![stocktake_push_record(), stocktake_om_field_push_record()]
}
