use crate::LocationTypeRow;

pub fn mock_location_type_a() -> LocationTypeRow {
    LocationTypeRow {
        id: "location_type_a_id".to_string(),
        name: "cold_location_type".to_string(),
        min_temperature: 1.0,
        max_temperature: 4.0,
    }
}

pub fn mock_location_type_b() -> LocationTypeRow {
    LocationTypeRow {
        id: "location_type_b_id".to_string(),
        name: "freezer_location_type".to_string(),
        min_temperature: -4.0,
        max_temperature: -8.0,
    }
}

pub fn mock_location_types() -> Vec<LocationTypeRow> {
    vec![mock_location_type_a(), mock_location_type_b()]
}
