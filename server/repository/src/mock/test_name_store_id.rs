use util::inline_init;

use crate::schema::{NameRow, NameStoreJoinRow, StoreRow};

use super::MockData;

pub fn mock_test_name_store_id() -> MockData {
    let mut result = MockData::default();
    result.names.push(mock_name_linked_to_store());
    result.names.push(mock_name_not_linked_to_store());

    result.stores.push(mock_store_linked_to_name());

    result
        .name_store_joins
        .push(mock_name_linked_to_store_join());
    result
        .name_store_joins
        .push(mock_name_not_linked_to_store_join());

    result
}

pub fn mock_name_linked_to_store() -> NameRow {
    NameRow {
        id: "name_linked_to_store_id".to_owned(),
        name: "Name linked to store".to_owned(),
        code: "name_linked_to_store_code".to_owned(),
        is_customer: true,
        is_supplier: true,
    }
}

pub fn mock_store_linked_to_name() -> StoreRow {
    inline_init(|s: &mut StoreRow| {
        s.id = "name_store_id".to_string();
        s.name_id = "name_linked_to_store_id".to_string();
        s.code = "name_store_code".to_string();
    })
}

pub fn mock_name_linked_to_store_join() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: "name_linked_to_store_id".to_owned(),
        name_id: "name_linked_to_store_id".to_owned(),
        store_id: "store_a".to_owned(),
        name_is_customer: true,
        name_is_supplier: true,
    }
}

pub fn mock_name_not_linked_to_store() -> NameRow {
    NameRow {
        id: "name_not_linked_to_store_id".to_owned(),
        name: "Name not linked to store".to_owned(),
        code: "name_not_linked_to_store_code".to_owned(),
        is_customer: true,
        is_supplier: true,
    }
}

pub fn mock_name_not_linked_to_store_join() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: "name_not_linked_to_store_id".to_owned(),
        name_id: "name_not_linked_to_store_id".to_owned(),
        store_id: "store_a".to_owned(),
        name_is_customer: true,
        name_is_supplier: true,
    }
}
