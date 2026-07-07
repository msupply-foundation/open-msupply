use crate::NameStoreJoinRow;

use super::{mock_name_a, mock_name_store_a, mock_name_store_b, program_master_list_store};

pub fn store_a_join_name_b() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("name_store_a_join_b"),
        name_id: String::from("name_store_b"),
        store_id: String::from("store_a"),
        name_is_customer: true,
        name_is_supplier: false,
    }
}

pub fn store_a_join_name_c() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("name_store_join_c"),
        name_id: String::from("name_store_c"),
        store_id: String::from("store_a"),
        name_is_customer: false,
        name_is_supplier: true,
    }
}

pub fn store_a_join_name_d() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("mock_name_store_join_d"),
        name_id: String::from("name_a"), // Note store_a.name_ID == "name_store_a", so this isn't a self relation.
        store_id: String::from("store_a"),
        name_is_customer: false,
        name_is_supplier: true,
    }
}

pub fn store_a_join_name_e() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("mock_name_store_join_e"),
        name_id: String::from("name_a"),
        store_id: String::from("store_c"),
        name_is_customer: false,
        name_is_supplier: true,
    }
}

pub fn mock_name_store_join_customer_a() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("name_store_join_customer_a"),
        name_id: String::from("name_customer_a"),
        store_id: String::from("store_a"),
        name_is_customer: true,
        name_is_supplier: false,
    }
}

pub fn store_a_join_test_id() -> NameStoreJoinRow {
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

pub fn name_store_join_program_a() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: "mock_name_store_master_list_join_a".to_string(),
        store_id: program_master_list_store().id,
        name_id: mock_name_store_a().id,
        name_is_customer: true,
        name_is_supplier: false,
    }
}

pub fn name_store_join_program_b() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: "mock_name_store_master_list_join_b".to_string(),
        store_id: program_master_list_store().id,
        name_id: mock_name_store_b().id,
        name_is_customer: false,
        name_is_supplier: true,
    }
}

pub fn name_store_join_program_a_name_a() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: "mock_name_store_join_a_name_a".to_string(),
        store_id: program_master_list_store().id,
        name_id: mock_name_a().id,
        name_is_customer: false,
        name_is_supplier: true,
    }
}

pub fn store_a_donor_a() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("mock_name_store_donor_a"),
        name_id: String::from("donor_a"),
        store_id: String::from("store_a"),
        name_is_customer: false,
        name_is_supplier: false,
    }
}

pub fn store_a_donor_b() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("mock_name_store_donor_b"),
        name_id: String::from("donor_b"),
        store_id: String::from("store_a"),
        name_is_customer: false,
        name_is_supplier: false,
    }
}

pub fn mock_name_store_joins() -> Vec<NameStoreJoinRow> {
    vec![
        store_a_join_name_b(),
        store_a_join_name_c(),
        store_a_join_name_d(),
        store_a_join_name_e(),
        store_a_join_test_id(),
        mock_name_store_join_customer_a(),
        mock_patient_store_join_b(),
        name_store_join_program_a(),
        name_store_join_program_b(),
        name_store_join_program_a_name_a(),
        store_a_donor_a(),
        store_a_donor_b(),
    ]
}
