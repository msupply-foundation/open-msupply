use crate::{MasterListNameJoinRow, MasterListRow, NameRow, StoreRow};

use super::{common::FullMockMasterList, MockData};

pub fn mock_test_master_list_repository() -> MockData {
    let mut result = MockData::default();
    result.names.push(mock_test_master_list_name1());
    result.names.push(mock_test_master_list_name2());
    result.names.push(mock_test_master_list_name3());
    result.stores.push(mock_test_master_list_store1());
    result
        .full_master_lists
        .push(mock_test_master_list_name_filter1());
    result
        .full_master_lists
        .push(mock_test_master_list_name_filter2());
    result
        .full_master_lists
        .push(mock_test_master_list_name_filter3());
    result
}

pub fn mock_test_master_list_name1() -> NameRow {
    let id = "mock_test_master_list_name1".to_owned();
    NameRow {
        id: id.clone(),
        name: id.clone(),
        code: id.clone(),
        is_customer: true,
        is_supplier: true,
        ..Default::default()
    }
}

pub fn mock_test_master_list_name2() -> NameRow {
    let id = "mock_test_master_list_name2".to_owned();
    NameRow {
        id: id.clone(),
        name: id.clone(),
        code: id.clone(),
        is_customer: true,
        is_supplier: true,
        ..Default::default()
    }
}

pub fn mock_test_master_list_name3() -> NameRow {
    let id = "mock_test_master_list_name3".to_owned();
    NameRow {
        id: id.clone(),
        name: id.clone(),
        code: id.clone(),
        is_customer: true,
        is_supplier: true,
        ..Default::default()
    }
}

pub fn mock_test_master_list_store1() -> StoreRow {
    StoreRow {
        id: "mock_test_master_list_store1".to_string(),
        name_link_id: mock_test_master_list_name3().id,
        code: "mock_test_master_list_store1".to_string(),
        ..Default::default()
    }
}

// For name 1 and 2
pub fn mock_test_master_list_name_filter1() -> FullMockMasterList {
    let id = "mock_test_master_list_name_filter1".to_owned();
    let join1 = format!("{}1", id);
    let join2 = format!("{}2", id);

    FullMockMasterList {
        master_list: MasterListRow {
            id: id.clone(),
            name: id.clone(),
            code: id.clone(),
            description: id.clone(),
            is_active: true,
            ..Default::default()
        },
        joins: vec![
            MasterListNameJoinRow {
                id: join1,
                master_list_id: id.clone(),
                name_link_id: mock_test_master_list_name1().id,
            },
            MasterListNameJoinRow {
                id: join2,
                master_list_id: id.clone(),
                name_link_id: mock_test_master_list_name2().id,
            },
        ],
        lines: Vec::new(),
    }
}

// For name 2 and 3
pub fn mock_test_master_list_name_filter2() -> FullMockMasterList {
    let id = "mock_test_master_list_name_filter2".to_owned();
    let join1 = format!("{}1", id);
    let join2 = format!("{}2", id);

    FullMockMasterList {
        master_list: MasterListRow {
            id: id.clone(),
            name: id.clone(),
            code: id.clone(),
            description: id.clone(),
            is_active: true,
            ..Default::default()
        },
        joins: vec![
            MasterListNameJoinRow {
                id: join1,
                master_list_id: id.clone(),
                name_link_id: mock_test_master_list_name2().id,
            },
            MasterListNameJoinRow {
                id: join2,
                master_list_id: id.clone(),
                name_link_id: mock_test_master_list_name3().id,
            },
        ],
        lines: Vec::new(),
    }
}

// For name 1 and 3
pub fn mock_test_master_list_name_filter3() -> FullMockMasterList {
    let id = "mock_test_master_list_name_filter3".to_owned();
    let join1 = format!("{}1", id);
    let join2 = format!("{}2", id);

    FullMockMasterList {
        master_list: MasterListRow {
            id: id.clone(),
            name: id.clone(),
            code: id.clone(),
            description: id.clone(),
            is_active: true,
            ..Default::default()
        },
        joins: vec![
            MasterListNameJoinRow {
                id: join1,
                master_list_id: id.clone(),
                name_link_id: mock_test_master_list_name1().id,
            },
            MasterListNameJoinRow {
                id: join2,
                master_list_id: id.clone(),
                name_link_id: mock_test_master_list_name3().id,
            },
        ],
        lines: Vec::new(),
    }
}
