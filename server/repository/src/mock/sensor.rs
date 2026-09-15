use crate::{SensorRow, SensorType};
use chrono::{Duration, NaiveDate};

pub fn mock_sensor_1() -> SensorRow {
    SensorRow {
        id: "sensor_1".to_string(),
        serial: "serial_sensor_1".to_string(),
        name: "name_sensor_1".to_string(),
        is_active: false,
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
    }
}

pub fn mock_sensor_is_active() -> SensorRow {
    SensorRow {
        id: "sensor_is_active".to_string(),
        serial: "serial_sensor_is_active".to_string(),
        name: "name_sensor_is_active".to_string(),
        is_active: true,
        store_id: "store_a".to_string(),
        location_id: None,
        battery_level: Some(90),
        log_interval: Some(5),
        last_connection_datetime: Some(
            NaiveDate::from_ymd_opt(2022, 7, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
                + Duration::seconds(47046),
        ),
        r#type: SensorType::BlueMaestro,
    }
}

// For case insensitive sort
pub fn mock_sensor_2() -> SensorRow {
    SensorRow {
        id: "sensor_2".to_string(),
        serial: "serial_SeNsoR_2".to_string(),
        name: "name_SeNsoR_2".to_string(),
        is_active: false,
        store_id: "store_a".to_string(),
        location_id: None,
        battery_level: Some(90),
        log_interval: Some(5),
        last_connection_datetime: Some(
            NaiveDate::from_ymd_opt(2022, 7, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
                + Duration::seconds(47046),
        ),
        r#type: SensorType::BlueMaestro,
    }
}

// Sensor in another store, for unique serial check
pub fn mock_sensor_in_another_store() -> SensorRow {
    SensorRow {
        id: "sensor_in_another_store".to_string(),
        serial: "store_b_sensor".to_string(),
        name: "store_b_sensor_name".to_string(),
        is_active: true,
        store_id: "store_b".to_string(),
        location_id: None,
        battery_level: Some(90),
        log_interval: Some(5),
        last_connection_datetime: Some(
            NaiveDate::from_ymd_opt(2022, 7, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
                + Duration::seconds(47046),
        ),
        r#type: SensorType::BlueMaestro,
    }
}

pub fn mock_sensors() -> Vec<SensorRow> {
    vec![
        mock_sensor_1(),
        mock_sensor_is_active(),
        mock_sensor_2(),
        mock_sensor_in_another_store(),
    ]
}
