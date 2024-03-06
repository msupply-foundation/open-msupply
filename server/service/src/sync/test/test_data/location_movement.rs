use crate::sync::translations::location_movement::LegacyLocationMovementRow;

use chrono::{NaiveDate, NaiveTime};
use repository::LocationMovementRow;
use serde_json::json;

use super::{TestSyncPullRecord, TestSyncPushRecord};

const TABLE_NAME: &'static str = "location_movement";

const LOCATION_MOVEMENT_1: (&'static str, &'static str) = (
    "77829028-8456-4adb-b428-243f67c6cc4f",
    r#"{
      "ID": "77829028-8456-4adb-b428-243f67c6cc4f",
      "enter_date": "2023-02-10",
      "enter_time": 1000,
      "exit_date": "0000-00-00",
      "exit_time": 0,
      "item_line_ID": "item_c_line_a",
      "location_ID": "",
      "store_ID": "store_a"
  }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        LOCATION_MOVEMENT_1,
        LocationMovementRow {
            id: LOCATION_MOVEMENT_1.0.to_string(),
            store_id: "store_a".to_string(),
            stock_line_id: "item_c_line_a".to_string(),
            location_id: None,
            enter_datetime: Some(
                NaiveDate::from_ymd_opt(2023, 2, 10)
                    .unwrap()
                    .and_time(NaiveTime::from_num_seconds_from_midnight_opt(1000, 0).unwrap()),
            ),
            exit_datetime: None,
        },
    )]
}

pub(crate) fn test_push_records() -> Vec<TestSyncPushRecord> {
    vec![TestSyncPushRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: LOCATION_MOVEMENT_1.0.to_string(),
        push_data: json!(LegacyLocationMovementRow {
            id: LOCATION_MOVEMENT_1.0.to_string(),
            store_id: "store_a".to_string(),
            stock_line_id: "item_c_line_a".to_string(),
            location_id: None,
            enter_date: Some(NaiveDate::from_ymd_opt(2023, 2, 10).unwrap()),
            enter_time: NaiveTime::from_num_seconds_from_midnight_opt(1000, 0).unwrap(),
            exit_date: None,
            exit_time: NaiveTime::from_num_seconds_from_midnight_opt(0, 0).unwrap(),
        }),
    }]
}
