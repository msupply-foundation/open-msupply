use crate::TemperatureBreachConfigRow;
use crate::TemperatureBreachRowType;

pub fn mock_temperature_breach_config_1() -> TemperatureBreachConfigRow {
    TemperatureBreachConfigRow {
        id: "temperature_breach_config_1".to_owned(),
        description: "Consecutive temperature_breach_config 1".to_owned(),
        is_active: false,
        r#type: TemperatureBreachRowType::HotConsecutive,
        store_id: Some("store_b".to_string()),
        minimum_temperature: 8.0,
        maximum_temperature: 100.0,
        duration: 3600,
    }
}

pub fn mock_temperature_breach_config_is_active() -> TemperatureBreachConfigRow {
    TemperatureBreachConfigRow {
        id: "temperature_breach_config_is_active".to_owned(),
        description: "active temperature_breach_config".to_owned(),
        is_active: true,
        r#type: TemperatureBreachRowType::HotConsecutive,
        store_id: Some("store_a".to_string()),
        minimum_temperature: 8.0,
        maximum_temperature: 100.0,
        duration: 3600,
    }
}

// For case insensitive sort
pub fn mock_temperature_breach_config_2() -> TemperatureBreachConfigRow {
    TemperatureBreachConfigRow {
        id: "temperature_breach_config_2".to_owned(),
        description: "cONSecutive temperature_breach_config 2".to_owned(),
        is_active: true,
        r#type: TemperatureBreachRowType::ColdConsecutive,
        store_id: Some("store_a".to_string()),
        minimum_temperature: -273.0,
        maximum_temperature: 2.0,
        duration: 3600,
    }
}

// TemperatureBreachConfig in another store, for unique description check
pub fn mock_temperature_breach_config_in_another_store() -> TemperatureBreachConfigRow {
    TemperatureBreachConfigRow {
        id: "temperature_breach_config_in_another_store".to_owned(),
        description: "store_b_temperature_breach_config".to_owned(),
        is_active: true,
        r#type: TemperatureBreachRowType::ColdConsecutive,
        store_id: Some("store_a".to_string()),
        minimum_temperature: -273.0,
        maximum_temperature: 2.0,
        duration: 3600,
    }
}

pub fn mock_temperature_breach_configs() -> Vec<TemperatureBreachConfigRow> {
    vec![
        mock_temperature_breach_config_1(),
        mock_temperature_breach_config_is_active(),
        mock_temperature_breach_config_2(),
        mock_temperature_breach_config_in_another_store(),
    ]
}
