use crate::sync::{
    test::TestSyncPullRecord,
    translations::{
        stocktake::{LegacyStocktakeRow, LegacyStocktakeStatus},
        LegacyTableName, PullUpsertRecord,
    },
};
use chrono::{NaiveDate, NaiveTime};
use repository::{StocktakeRow, StocktakeStatus};
use serde_json::json;

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
fn stocktake_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::STOCKTAKE,
        STOCKTAKE_1,
        PullUpsertRecord::Stocktake(StocktakeRow {
            id: STOCKTAKE_1.0.to_string(),
            user_id: "".to_string(),
            store_id: "store_a".to_string(),
            stocktake_number: 3,
            comment: None,
            description: Some("Test".to_string()),
            status: StocktakeStatus::Finalised,
            created_datetime: NaiveDate::from_ymd(2021, 07, 30)
                .and_time(NaiveTime::from_num_seconds_from_midnight_opt(47061, 0).unwrap()),
            finalised_datetime: None,
            inventory_adjustment_id: Some("inbound_shipment_a".to_string()),
            is_locked: false,
            stocktake_date: Some(NaiveDate::from_ymd(2021, 07, 30)),
        }),
    )
}
fn stocktake_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        table_name: LegacyTableName::STOCKTAKE.to_string(),
        record_id: STOCKTAKE_1.0.to_string(),
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
            stock_take_time: NaiveTime::from_num_seconds_from_midnight_opt(47061, 0).unwrap(),
            created_datetime: Some(
                NaiveDate::from_ymd(2021, 07, 30)
                    .and_time(NaiveTime::from_num_seconds_from_midnight_opt(47061, 0).unwrap())
            ),
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
      "stock_take_time": 47062,
      "store_ID": "store_a",
      "type": "",
      "om_created_datetime": "2021-07-30T15:15:15",
      "om_finalised_datetime": "2021-07-31T15:15:15"
    }"#,
);
fn stocktake_om_field_pull_record() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::STOCKTAKE,
        STOCKTAKE_OM_FIELD,
        PullUpsertRecord::Stocktake(StocktakeRow {
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
    )
}
fn stocktake_om_field_push_record() -> TestSyncPushRecord {
    TestSyncPushRecord {
        table_name: LegacyTableName::STOCKTAKE.to_string(),
        record_id: STOCKTAKE_OM_FIELD.0.to_string(),
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
            stock_take_time: NaiveTime::from_hms(15, 15, 15),
            is_locked: false,
            stocktake_date: Some(NaiveDate::from_ymd(2021, 07, 30)),
            created_datetime: Some(NaiveDate::from_ymd(2021, 07, 30).and_hms(15, 15, 15)),
            finalised_datetime: Some(NaiveDate::from_ymd(2021, 07, 31).and_hms(15, 15, 15)),
        }),
    }
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![stocktake_pull_record(), stocktake_om_field_pull_record()]
}

pub(crate) fn test_push_records() -> Vec<TestSyncPushRecord> {
    vec![stocktake_push_record(), stocktake_om_field_push_record()]
}
