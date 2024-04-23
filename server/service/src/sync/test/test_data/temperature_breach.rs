use crate::sync::translations::temperature_breach::{
    LegacyTemperatureBreachRow, LegacyTemperatureBreachType,
};

use chrono::{Duration, NaiveDate, NaiveTime};
use repository::{TemperatureBreachRow, TemperatureBreachRowType};
use serde_json::json;

use super::{TestSyncIncomingRecord, TestSyncOutgoingRecord};

const TABLE_NAME: &str = "temperature_breach";

const TEMPERATURE_BREACH_1: (&str, &str) = (
    "996812e0c33911eb9757779d39ae2dbd",
    r#"{
        "ID": "996812e0c33911eb9757779d39ae2dbd",
        "sensor_ID": "cf5812e0c33911eb9757779d39ae2dbd",
        "location_ID": "",
        "type": "COLD_CONSECUTIVE",
        "threshold_minimum_temperature": -273.0,
        "threshold_maximum_temperature": 2.0,
        "threshold_duration": 3600,
        "duration": 86400,
        "acknowledged": false,
        "store_ID": "store_a",
        "start_date": "2023-07-01",
        "start_time": 47046,
        "end_date": "2023-07-02",
        "end_time": 47046,
        "om_end_datetime": "" ,
        "om_start_datetime": "",
        "om_comment": ""
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        TEMPERATURE_BREACH_1,
        TemperatureBreachRow {
            id: TEMPERATURE_BREACH_1.0.to_string(),
            store_id: "store_a".to_string(),
            location_id: None,
            r#type: TemperatureBreachRowType::ColdConsecutive,
            duration_milliseconds: 86400,
            unacknowledged: true,
            sensor_id: "cf5812e0c33911eb9757779d39ae2dbd".to_string(),
            threshold_minimum: -273.0,
            threshold_maximum: 2.0,
            threshold_duration_milliseconds: 3600,
            start_datetime: NaiveDate::from_ymd_opt(2023, 7, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
                + Duration::seconds(47046),
            end_datetime: Some(
                NaiveDate::from_ymd_opt(2023, 7, 2)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(47046),
            ),
            comment: None,
        },
    )]
}

pub(crate) fn test_push_records() -> Vec<TestSyncOutgoingRecord> {
    vec![TestSyncOutgoingRecord {
        table_name: TABLE_NAME.to_string(),
        record_id: TEMPERATURE_BREACH_1.0.to_string(),
        push_data: json!(LegacyTemperatureBreachRow {
            id: TEMPERATURE_BREACH_1.0.to_string(),
            r#type: LegacyTemperatureBreachType::ColdConsecutive,
            duration_milliseconds: 86400,
            acknowledged: false,
            sensor_id: "cf5812e0c33911eb9757779d39ae2dbd".to_string(),
            store_id: "store_a".to_string(),
            location_id: None,
            threshold_minimum: -273.0,
            threshold_maximum: 2.0,
            threshold_duration_milliseconds: 3600,
            start_date: NaiveDate::from_ymd_opt(2023, 7, 1),
            start_time: NaiveTime::from_hms_opt(13, 4, 6).unwrap(),
            end_date: Some(NaiveDate::from_ymd_opt(2023, 7, 2).unwrap()),
            end_time: NaiveTime::from_hms_opt(13, 4, 6).unwrap(),
            start_datetime: Some(
                NaiveDate::from_ymd_opt(2023, 7, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(47046)
            ),
            end_datetime: Some(
                NaiveDate::from_ymd_opt(2023, 7, 2)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(47046),
            ),
            comment: None,
        }),
    }]
}
