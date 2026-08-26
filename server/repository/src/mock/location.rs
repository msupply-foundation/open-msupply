use crate::LocationRow;

pub fn mock_location_1() -> LocationRow {
    LocationRow {
        id: "location_1".to_string(),
        code: "code_location_1".to_string(),
        name: "name_location_1".to_string(),
        store_id: "store_a".to_string(),
        ..Default::default()
    }
}

pub fn mock_location_on_hold() -> LocationRow {
    LocationRow {
        id: "location_on_hold".to_string(),
        code: "code_location_on_hold".to_string(),
        name: "name_location_on_hold".to_string(),
        on_hold: true,
        store_id: "store_a".to_string(),
        ..Default::default()
    }
}

// For case insensitive sort
pub fn mock_location_2() -> LocationRow {
    LocationRow {
        id: "location_2".to_string(),
        code: "code_LocAtIOn_2".to_string(),
        name: "name_LocAtIOn_2".to_string(),
        store_id: "store_a".to_string(),
        ..Default::default()
    }
}

pub fn mock_location_3() -> LocationRow {
    LocationRow {
        id: "location_3".to_string(),
        code: "code_location_3".to_string(),
        name: "name_location_3".to_string(),
        store_id: "store_a".to_string(),
        ..Default::default()
    }
}

// Location in another store, for unique code check
pub fn mock_location_in_another_store() -> LocationRow {
    LocationRow {
        id: "location_in_another_store".to_string(),
        code: "store_b_location".to_string(),
        name: "store_b_location_name".to_string(),
        store_id: "store_b".to_string(),
        ..Default::default()
    }
}

pub fn mock_location_with_restricted_location_type_a() -> LocationRow {
    LocationRow {
        id: "location_with_restricted_location_type".to_string(),
        code: "code_restricted_location_type_location".to_string(),
        name: "name_restricted_location_type_location".to_string(),
        store_id: "store_a".to_string(),
        location_type_id: Some("location_type_a_id".to_string()),
        ..Default::default()
    }
}

pub fn mock_locations() -> Vec<LocationRow> {
    vec![
        mock_location_1(),
        mock_location_on_hold(),
        mock_location_2(),
        mock_location_3(),
        mock_location_in_another_store(),
        mock_location_with_restricted_location_type_a(),
    ]
}
