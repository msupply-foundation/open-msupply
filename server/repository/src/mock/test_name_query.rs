use util::inline_init;

use crate::{NameRow, NameStoreJoinRow, StoreRow};

use super::MockData;

pub fn mock_test_name_query() -> MockData {
    MockData {
        names: vec![mock_name_1(), mock_name_2(), mock_name_3(), name_a_umlaut()],
        stores: vec![
            mock_test_name_query_store_1(),
            mock_test_name_query_store_2(),
        ],
        name_store_joins: vec![
            mock_name_1_join(),
            mock_name_2_join(),
            mock_name_3_join(),
            mock_name_3_join2(),
            name_a_umlaut_join(),
        ],
        ..Default::default()
    }
}

pub fn mock_test_name_query_store_1() -> StoreRow {
    inline_init(|s: &mut StoreRow| {
        s.id = "mock_test_name_query_store_1".to_string();
        s.name_link_id = mock_name_1().id;
        s.code = "mock_test_name_query_store_1_code".to_string();
    })
}

pub fn mock_test_name_query_store_2() -> StoreRow {
    inline_init(|s: &mut StoreRow| {
        s.id = "mock_test_name_query_store_2".to_string();
        s.name_link_id = mock_name_2().id;
        s.code = "mock_test_name_query_store_2_code".to_string();
    })
}

pub fn mock_name_1() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = "name1".to_string();
        r.name = "name_1".to_string();
        r.code = "code1".to_string();
    })
}

pub fn mock_name_1_join() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("mock_name_1_join_id"),
        name_link_id: mock_name_1().id,
        store_id: mock_test_name_query_store_2().id,
        name_is_customer: false,
        name_is_supplier: true,
    }
}

pub fn mock_name_2() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = "name2".to_string();
        r.name = "name_2".to_string();
        r.code = "code2".to_string();
        r.national_health_number = Some("nhn2".to_string());
    })
}

pub fn mock_name_2_join() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("mock_name_2_join_id"),
        name_link_id: mock_name_2().id,
        store_id: mock_test_name_query_store_1().id,
        name_is_customer: true,
        name_is_supplier: true,
    }
}

pub fn mock_name_3() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = "name3".to_string();
        r.name = "name_3".to_string();
        r.code = "code3".to_string();
    })
}

pub fn mock_name_3_join() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("mock_name_3_join_id"),
        name_link_id: mock_name_3().id,
        store_id: mock_test_name_query_store_1().id,
        name_is_customer: true,
        name_is_supplier: true,
    }
}

pub fn mock_name_3_join2() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("mock_name_3_join2_id"),
        name_link_id: mock_name_3().id,
        store_id: mock_test_name_query_store_2().id,
        name_is_customer: false,
        name_is_supplier: false,
    }
}

pub fn name_a_umlaut() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = "name_äÄ_umlaut".to_string();
        r.name = "a_umlaut_äÄ_name".to_string();
        r.code = "a_umlaut_äÄ_code".to_string();
    })
}

pub fn name_a_umlaut_join() -> NameStoreJoinRow {
    NameStoreJoinRow {
        id: String::from("name_a_umlaut_join_id"),
        name_link_id: name_a_umlaut().id,
        store_id: mock_test_name_query_store_1().id,
        name_is_customer: true,
        name_is_supplier: true,
    }
}
