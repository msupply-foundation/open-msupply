use crate::{TemperatureBreachConfigRow, TemperatureBreachType};

pub fn mock_temperature_breach_config_1() -> TemperatureBreachConfigRow {
    TemperatureBreachConfigRow {
        id: "temperature_breach_config_1".to_owned(),
        duration_milliseconds: 120000,
        r#type: TemperatureBreachType::HotConsecutive,
        description: "Hot consecutive for 2 minutes".to_string(),
        is_active: true,
        store_id: "store_a".to_string(),
        minimum_temperature: -273.0,
        maximum_temperature: 8.0,
    }
}
pub fn mock_temperature_breach_config_2() -> TemperatureBreachConfigRow {
    TemperatureBreachConfigRow {
        id: "temperature_breach_config_2".to_owned(),
        duration_milliseconds: 360000,
        r#type: TemperatureBreachType::HotConsecutive,
        description: "Hot consecutive for 1 hour".to_string(),
        is_active: false,
        store_id: "store_a".to_string(),
        minimum_temperature: -273.0,
        maximum_temperature: -20.0,
    }
}
pub fn mock_temperature_breach_config_3() -> TemperatureBreachConfigRow {
    TemperatureBreachConfigRow {
        id: "temperature_breach_config_3".to_owned(),
        duration_milliseconds: 120000,
        r#type: TemperatureBreachType::ColdConsecutive,
        description: "Cold consecutive for 2 minutes".to_string(),
        is_active: true,
        store_id: "store_a".to_string(),
        minimum_temperature: 2.0,
        maximum_temperature: 100.0,
    }
}

pub fn mock_temperature_breach_configs() -> Vec<TemperatureBreachConfigRow> {
    vec![
        mock_temperature_breach_config_1(),
        mock_temperature_breach_config_2(),
        mock_temperature_breach_config_3(),
    ]
}
