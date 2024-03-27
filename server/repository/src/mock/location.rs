use crate::LocationRow;

pub fn mock_location_1() -> LocationRow {
    LocationRow {
        id: "location_1".to_owned(),
        code: "code_location_1".to_owned(),
        name: "name_location_1".to_owned(),
        on_hold: false,
        store_id: "store_a".to_string(),
    }
}

pub fn mock_location_on_hold() -> LocationRow {
    LocationRow {
        id: "location_on_hold".to_owned(),
        code: "code_location_on_hold".to_owned(),
        name: "name_location_on_hold".to_owned(),
        on_hold: true,
        store_id: "store_a".to_string(),
    }
}

// For case insensitive sort
pub fn mock_location_2() -> LocationRow {
    LocationRow {
        id: "location_2".to_owned(),
        code: "code_LocAtIOn_2".to_owned(),
        name: "name_LocAtIOn_2".to_owned(),
        on_hold: false,
        store_id: "store_a".to_string(),
    }
}

pub fn mock_location_3() -> LocationRow {
    LocationRow {
        id: "location_3".to_owned(),
        code: "code_location_3".to_owned(),
        name: "name_location_3".to_owned(),
        on_hold: false,
        store_id: "store_a".to_string(),
    }
}

// Location in another store, for unique code check
pub fn mock_location_in_another_store() -> LocationRow {
    LocationRow {
        id: "location_in_another_store".to_owned(),
        code: "store_b_location".to_owned(),
        name: "store_b_location_name".to_owned(),
        on_hold: false,
        store_id: "store_b".to_string(),
    }
}

pub fn mock_locations() -> Vec<LocationRow> {
    vec![
        mock_location_1(),
        mock_location_on_hold(),
        mock_location_2(),
        mock_location_3(),
        mock_location_in_another_store(),
    ]
}
