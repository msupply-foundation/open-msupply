use crate::{NameRow, NameRowType, NameStoreJoinRow, StoreRow};

use super::MockData;

pub fn mock_test_name_store_id() -> MockData {
    let mut result = MockData::default();
    result.names.push(mock_name_linked_to_store());
    result.names.push(mock_name_linked_to_store_a());
    result.names.push(mock_name_not_linked_to_store());
    result.names.push(mock_name_not_linked_to_store_a());

    result.stores.push(mock_store_linked_to_name());
    result.stores.push(mock_store_linked_to_name_a());

    result
        .name_store_joins
        .push(mock_name_linked_to_store_join());
    result
        .name_store_joins
        .push(mock_name_linked_to_store_join_a());
    result
        .name_store_joins
        .push(mock_name_not_linked_to_store_join());
    result
        .name_store_joins
        .push(mock_name_not_linked_to_store_join_a());
    result.names.push(mock_patient_linked_to_store());
    result.stores.push(mock_store_linked_to_patient());

    result
}

pub fn mock_name_linked_to_store() -> NameRow {
    NameRow {
        id: "name_linked_to_store_id".to_string(),
        name: "Name linked to store".to_string(),
        code: "name_linked_to_store_code".to_string(),
        is_customer: true,
        is_supplier: true,
        ..Default::default()
    }
}

pub fn mock_store_linked_to_name() -> StoreRow {
    StoreRow {
        id: "name_store_id".to_string(),
        name_id: "name_linked_to_store_id".to_string(),
        code: "name_store_code".to_string(),
        ..Default::default()
    }
}

pub fn mock_name_linked_to_store_join() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: "name_linked_to_store_id".to_string(),
        name_id: "name_linked_to_store_id".to_string(),
        store_id: "store_a".to_string(),
        name_is_customer: true,
        name_is_supplier: true,
    }
}

pub fn mock_name_linked_to_store_a() -> NameRow {
    NameRow {
        id: "name_linked_to_store_a_id".to_string(),
        name: "Name linked to store a".to_string(),
        code: "name_linked_to_store_code_a".to_string(),
        is_customer: true,
        is_supplier: true,
        ..Default::default()
    }
}

pub fn mock_store_linked_to_name_a() -> StoreRow {
    StoreRow {
        id: "name_store_a_id".to_string(),
        name_id: "name_linked_to_store_a_id".to_string(),
        code: "name_store_code_a".to_string(),
        ..Default::default()
    }
}

pub fn mock_name_linked_to_store_join_a() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: "name_linked_to_store_a_id".to_string(),
        name_id: "name_linked_to_store_a_id".to_string(),
        store_id: "store_c".to_string(),
        name_is_customer: true,
        name_is_supplier: true,
    }
}

pub fn mock_name_not_linked_to_store() -> NameRow {
    NameRow {
        id: "name_not_linked_to_store_id".to_string(),
        name: "Name not linked to store".to_string(),
        code: "name_not_linked_to_store_code".to_string(),
        is_customer: true,
        is_supplier: true,
        ..Default::default()
    }
}

pub fn mock_name_not_linked_to_store_join() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: "name_not_linked_to_store_id".to_string(),
        name_id: "name_not_linked_to_store_id".to_string(),
        store_id: "store_a".to_string(),
        name_is_customer: true,
        name_is_supplier: true,
    }
}

pub fn mock_name_not_linked_to_store_a() -> NameRow {
    NameRow {
        id: "name_not_linked_to_store_a_id".to_string(),
        name: "Name not linked to store".to_string(),
        code: "name_not_linked_to_store_a_code".to_string(),
        is_customer: true,
        is_supplier: true,
        ..Default::default()
    }
}

pub fn mock_name_not_linked_to_store_join_a() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: "name_not_linked_to_store_a_id".to_string(),
        name_id: "name_not_linked_to_store_a_id".to_string(),
        store_id: "store_c".to_string(),
        name_is_customer: true,
        name_is_supplier: true,
    }
}

pub fn mock_patient_linked_to_store() -> NameRow {
    NameRow {
        id: "patient_linked_to_store_id".to_string(),
        name: "Patient linked to store".to_string(),
        code: "mock_patient_linked_to_store_code".to_string(),
        is_customer: true,
        is_supplier: true,
        r#type: NameRowType::Patient,
        ..Default::default()
    }
}

pub fn mock_store_linked_to_patient() -> StoreRow {
    StoreRow {
        id: "patient_store_id".to_string(),
        name_id: "patient_linked_to_store_id".to_string(),
        code: "patient_store_code".to_string(),
        ..Default::default()
    }
}
