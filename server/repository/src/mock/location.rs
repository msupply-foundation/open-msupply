use crate::schema::LocationRow;

pub fn mock_locations() -> Vec<LocationRow> {
    vec![
        LocationRow {
            id: "location_1".to_owned(),
            code: "code_location_1".to_owned(),
            name: "name_location_1".to_owned(),
            on_hold: false,
        },
        LocationRow {
            id: "location_on_hold".to_owned(),
            code: "code_location_on_hold".to_owned(),
            name: "name_location_on_hold".to_owned(),
            on_hold: true,
        },
    ]
}
