use crate::database::schema::StoreRow;

pub fn mock_store_a() -> StoreRow {
    StoreRow {
        id: String::from("store_a"),
        name_id: String::from("name_store_a"),
    }
}

pub fn mock_store_b() -> StoreRow {
    StoreRow {
        id: String::from("store_b"),
        name_id: String::from("name_store_b"),
    }
}

pub fn mock_store_c() -> StoreRow {
    StoreRow {
        id: String::from("store_c"),
        name_id: String::from("name_store_c"),
    }
}

pub fn mock_stores() -> Vec<StoreRow> {
    vec![mock_store_a(), mock_store_b(), mock_store_c()]
}
