use crate::TemperatureLogRow;
use chrono::{Duration, NaiveDate};

// hot breach, sensor 1 in store a
pub fn mock_temperature_log_1a() -> TemperatureLogRow {
    TemperatureLogRow {
        id: "temperature_log_1a".to_string(),
        sensor_id: "sensor_1".to_string(),
        store_id: "store_a".to_string(),
        temperature: 10.6,
        location_id: None,
        datetime: NaiveDate::from_ymd_opt(2023, 7, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            + Duration::seconds(47046),
        temperature_breach_id: None,
    }
}

pub fn mock_temperature_log_1b() -> TemperatureLogRow {
    TemperatureLogRow {
        id: "temperature_log_1b".to_string(),
        sensor_id: "sensor_1".to_string(),
        store_id: "store_a".to_string(),
        temperature: 8.6,
        location_id: None,
        datetime: NaiveDate::from_ymd_opt(2023, 7, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            + Duration::seconds(53046),
        temperature_breach_id: None,
    }
}

// no breach sensor 1 in store a
pub fn mock_temperature_log_2() -> TemperatureLogRow {
    TemperatureLogRow {
        id: "temperature_log_2".to_string(),
        sensor_id: "sensor_1".to_string(),
        store_id: "store_a".to_string(),
        temperature: 5.6,
        location_id: None,
        datetime: NaiveDate::from_ymd_opt(2022, 7, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            + Duration::seconds(47646),
        temperature_breach_id: None,
    }
}

// cold breach sensor 2 in store b
pub fn mock_temperature_log_3a() -> TemperatureLogRow {
    TemperatureLogRow {
        id: "temperature_log_3a".to_string(),
        sensor_id: "sensor_2".to_string(),
        store_id: "store_b".to_string(),
        temperature: -1.6,
        location_id: None,
        datetime: NaiveDate::from_ymd_opt(2022, 7, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            + Duration::seconds(48246),
        temperature_breach_id: None,
    }
}
pub fn mock_temperature_log_3b() -> TemperatureLogRow {
    TemperatureLogRow {
        id: "temperature_log_3b".to_string(),
        sensor_id: "sensor_2".to_string(),
        store_id: "store_b".to_string(),
        temperature: 1.6,
        location_id: None,
        datetime: NaiveDate::from_ymd_opt(2022, 7, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            + Duration::seconds(54246),
        temperature_breach_id: None,
    }
}

// no breach sensor 2 in store b
pub fn mock_temperature_log_4() -> TemperatureLogRow {
    TemperatureLogRow {
        id: "temperature_log_4".to_string(),
        sensor_id: "sensor_2".to_string(),
        store_id: "store_b".to_string(),
        temperature: 4.6,
        location_id: None,
        datetime: NaiveDate::from_ymd_opt(2022, 7, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            + Duration::seconds(48846),
        temperature_breach_id: None,
    }
}

pub fn mock_temperature_logs() -> Vec<TemperatureLogRow> {
    vec![
        mock_temperature_log_1a(),
        mock_temperature_log_1b(),
        mock_temperature_log_2(),
        mock_temperature_log_3a(),
        mock_temperature_log_3b(),
        mock_temperature_log_4(),
    ]
}
