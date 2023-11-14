use crate::sync::translations::{sensor::LegacySensorRow, LegacyTableName, PullUpsertRecord};

use chrono::{Duration, NaiveDate, NaiveTime};
use repository::{SensorRow, SensorType};
use serde_json::json;

use super::{TestSyncPullRecord, TestSyncPushRecord};

const SENSOR_1: (&'static str, &'static str) = (
    "cf5812e0c33911eb9757779d39ae2dbd",
    r#"{
        "ID": "cf5812e0c33911eb9757779d39ae2dbd",
        "macAddress": "SerialRed.02 | BLUE_MAESTRO",
        "name": "NameRed.02",
        "locationID": "",
        "batteryLevel": 100,
        "logInterval": 1,
        "storeID": "store_a",
        "is_active": true,
        "lastConnectionDate": "2023-07-01",
        "lastConnectionTime": 47046,
        "om_last_connection_datetime":""
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::SENSOR,
        SENSOR_1,
        PullUpsertRecord::Sensor(SensorRow {
            id: SENSOR_1.0.to_string(),
            name: "NameRed.02".to_string(),
            serial: "SerialRed.02".to_string(),
            is_active: true,
            store_id: "store_a".to_string(),
            location_id: None,
            battery_level: Some(100),
            log_interval: Some(1),
            last_connection_datetime: Some(
                NaiveDate::from_ymd_opt(2023, 7, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(47046),
            ),
            r#type: SensorType::BlueMaestro,
        }),
    )]
}

pub(crate) fn test_push_records() -> Vec<TestSyncPushRecord> {
    vec![TestSyncPushRecord {
        table_name: LegacyTableName::SENSOR.to_string(),
        record_id: SENSOR_1.0.to_string(),
        push_data: json!(LegacySensorRow {
            id: SENSOR_1.0.to_string(),
            name: "NameRed.02".to_string(),
            serial: "SerialRed.02 | BLUE_MAESTRO".to_string(),
            is_active: true,
            store_id: "store_a".to_string(),
            location_id: None,
            battery_level: Some(100),
            log_interval: Some(1),
            last_connection_date: Some(NaiveDate::from_ymd_opt(2023, 7, 1).unwrap()),
            last_connection_time: NaiveTime::from_hms_opt(13, 4, 6).unwrap(),
            last_connection_datetime: Some(
                NaiveDate::from_ymd_opt(2023, 7, 1)
                    .unwrap()
                    .and_hms_opt(0, 0, 0)
                    .unwrap()
                    + Duration::seconds(47046),
            ),
        }),
    }]
}
