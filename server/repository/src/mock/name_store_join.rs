use crate::NameStoreJoinRow;

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
        store_id: String::from("store_a"),
        name_is_customer: true,
        name_is_supplier: false,
    }
}

pub fn mock_name_store_join_c() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("name_store_join_c"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        name_is_customer: false,
        name_is_supplier: true,
    }
}

pub fn mock_name_store_join_d() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("mock_name_store_join_d"),
        name_id: String::from("name_a"),
        store_id: String::from("store_a"),
        name_is_customer: false,
        name_is_supplier: true,
    }
}

pub fn mock_name_store_join_e() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("mock_name_store_join_e"),
        name_id: String::from("name_a"),
        store_id: String::from("store_c"),
        name_is_customer: false,
        name_is_supplier: true,
    }
}

pub fn mock_patient_store_join() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("mock_patient_store_join"),
        name_id: String::from("testId"),
        store_id: String::from("store_a"),
        name_is_customer: true,
        name_is_supplier: true,
    }
}

pub fn mock_patient_store_join_b() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("mock_patient_store_join_b"),
        name_id: String::from("patient2"),
        store_id: String::from("store_a"),
        name_is_customer: true,
        name_is_supplier: true,
    }
}

pub fn mock_name_store_joins() -> Vec<NameStoreJoinRow> {
    vec![
        mock_name_store_join_a(),
        mock_name_store_join_b(),
        mock_name_store_join_c(),
        mock_name_store_join_d(),
        mock_name_store_join_e(),
        mock_patient_store_join(),
        mock_patient_store_join_b(),
    ]
}
