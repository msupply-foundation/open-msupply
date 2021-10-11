use crate::database::schema::NameStoreJoinRow;

pub fn mock_name_store_join_a() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("name_store_join_a"),
        name_id: String::from("name_store_a"),
        store_id: String::from("store_a"),
        name_is_customer: true,
        name_is_supplier: false,
    }
}

pub fn mock_name_store_join_b() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("name_store_join_b"),
        name_id: String::from("name_store_b"),
        store_id: String::from("store_b"),
        name_is_customer: true,
        name_is_supplier: false,
    }
}

pub fn mock_name_store_join_c() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("name_store_join_c"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_c"),
        name_is_customer: false,
        name_is_supplier: true,
    }
}

pub fn mock_name_store_joins() -> Vec<NameStoreJoinRow> {
    vec![
        mock_name_store_join_a(),
        mock_name_store_join_b(),
        mock_name_store_join_c(),
    ]
}
