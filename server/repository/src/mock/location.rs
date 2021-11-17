use crate::schema::LocationRow;

pub fn mock_locations() -> Vec<LocationRow> {
    vec![
        LocationRow {
            id: "location_1".to_owned(),
            code: "code_location_1".to_owned(),
            name: "name_location_1".to_owned(),
            on_hold: false,
            store_id: "store_a".to_string(),
        },
        LocationRow {
            id: "location_on_hold".to_owned(),
            code: "code_location_on_hold".to_owned(),
            name: "name_location_on_hold".to_owned(),
            on_hold: true,
            store_id: "store_a".to_string(),
        },
        // For case insensitive sort
        LocationRow {
            id: "location_2".to_owned(),
            code: "code_LocAtIOn_2".to_owned(),
            name: "name_LocAtIOn_2".to_owned(),
            on_hold: false,
            store_id: "store_a".to_string(),
        },
    ]
}
