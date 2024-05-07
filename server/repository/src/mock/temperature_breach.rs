use crate::TemperatureBreachRow;
use crate::TemperatureBreachType;
use chrono::{Duration, NaiveDate};

// hot breach sensor 1 in store a
pub fn mock_temperature_breach_1() -> TemperatureBreachRow {
    TemperatureBreachRow {
        id: "temperature_breach_1".to_owned(),
        unacknowledged: true,
        r#type: TemperatureBreachType::HotConsecutive,
        store_id: "store_a".to_string(),
        threshold_minimum: 8.0,
        threshold_maximum: 100.0,
        threshold_duration_milliseconds: 3600,
        sensor_id: "sensor_1".to_owned(),
        duration_milliseconds: 6000,
        location_id: None,
        start_datetime: NaiveDate::from_ymd_opt(2022, 7, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            + Duration::seconds(47046),
        end_datetime: Some(
            NaiveDate::from_ymd_opt(2022, 7, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
                + Duration::seconds(53046),
        ),
        comment: None,
    }
}

// acknowledged hot breach sensor 1 in store a
pub fn mock_temperature_breach_acknowledged() -> TemperatureBreachRow {
    TemperatureBreachRow {
        id: "temperature_breach_acknowledged".to_owned(),
        unacknowledged: false,
        r#type: TemperatureBreachType::HotConsecutive,
        store_id: "store_a".to_string(),
        threshold_minimum: 8.0,
        threshold_maximum: 100.0,
        threshold_duration_milliseconds: 3600,
        sensor_id: "sensor_1".to_owned(),
        duration_milliseconds: 86400,
        location_id: None,
        start_datetime: NaiveDate::from_ymd_opt(2022, 8, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            + Duration::seconds(48246),
        end_datetime: Some(
            NaiveDate::from_ymd_opt(2022, 8, 2)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
                + Duration::seconds(48246),
        ),
        comment: None,
    }
}

// cold breach sensor 2 in store b
pub fn mock_temperature_breach_2() -> TemperatureBreachRow {
    TemperatureBreachRow {
        id: "temperature_breach_2".to_owned(),
        unacknowledged: true,
        r#type: TemperatureBreachType::ColdConsecutive,
        store_id: "store_b".to_string(),
        threshold_minimum: -273.0,
        threshold_maximum: 2.0,
        threshold_duration_milliseconds: 3600,
        sensor_id: "sensor_1".to_owned(),
        duration_milliseconds: 6000,
        location_id: None,
        start_datetime: NaiveDate::from_ymd_opt(2022, 7, 1)
            .unwrap()
            .and_hms_opt(0, 0, 0)
            .unwrap()
            + Duration::seconds(48246),
        end_datetime: Some(
            NaiveDate::from_ymd_opt(2022, 7, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap()
                + Duration::seconds(54246),
        ),
        comment: None,
    }
}

pub fn mock_temperature_breaches() -> Vec<TemperatureBreachRow> {
    vec![
        mock_temperature_breach_1(),
        mock_temperature_breach_acknowledged(),
        mock_temperature_breach_2(),
    ]
}
