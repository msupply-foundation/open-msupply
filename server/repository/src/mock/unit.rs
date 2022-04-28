use crate::db_diesel::UnitRow;

pub fn item_query_test2_unit() -> UnitRow {
    UnitRow {
        id: "item_query_test2".to_owned(),
        description: Some("description_item_query_test2".to_owned()),
        name: "name_item_query_test2".to_owned(),
        index: 1,
    }
}

pub fn mock_units() -> Vec<UnitRow> {
    vec![item_query_test2_unit()]
}
