use crate::sync::translations::temperature_log::LegacyTemperatureLogRow;

use chrono::{Duration, NaiveDate, NaiveTime};
use repository::TemperatureLogRow;
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &'static str = "temperature_log";

const TEMPERATURE_LOG_1: (&'static str, &'static str) = (
    "995812e0c33911eb9757779d39ae2dbd",
    r#"{
        "ID": "995812e0c33911eb9757779d39ae2dbd",
        "sensor_ID": "cf5812e0c33911eb9757779d39ae2dbd",
        "location_ID": "",
        "temperature": 10.6,
        "store_ID": "store_a",
        "date": "2023-07-01",
        "time": 47046,
        "temperature_breach_ID": "",
        "om_datetime":""
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        TEMPERATURE_LOG_1,
        TemperatureLogRow {
            id: TEMPERATURE_LOG_1.0.to_string(),
            store_id: "store_a".to_string(),
            location_id: None,
            temperature: 10.6,
            sensor_id: "cf5812e0c33911eb9757779d39ae2dbd".to_string(),
            datetime: NaiveDate::from_ymd_opt(2023, 7, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
                + Duration::seconds(47046),
            temperature_breach_id: None,
        },
    )]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: TEMPERATURE_LOG_1.0.to_string(),
        push_data: json!(LegacyTemperatureLogRow {
            id: TEMPERATURE_LOG_1.0.to_string(),
            temperature: 10.6,
            sensor_id: "cf5812e0c33911eb9757779d39ae2dbd".to_string(),
            store_id: "store_a".to_string(),
            location_id: None,
            date: NaiveDate::from_ymd_opt(2023, 7, 1),
            time: NaiveTime::from_hms_opt(13, 4, 6).unwrap(),
            temperature_breach_id: None,
            datetime: Some(
                NaiveDate::from_ymd_opt(2023, 7, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(47046)
            ),
        }),
    }]
}
