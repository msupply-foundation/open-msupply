use crate::{NameRow, StoreRow};

use super::MockData;

pub fn mock_name_store_remote_pull() -> NameRow {
    NameRow {
        id: String::from("name_store_remote_pull"),
        name: String::from("Store for remote pull"),
        code: String::from("code"),
        is_supplier: true,
        ..Default::default()
    }
}

// unique store is needed for number tests since number ids are not unique
pub fn mock_store_remote_pull() -> StoreRow {
    StoreRow {
        id: "store_remote_pull".to_string(),
        name_link_id: "name_store_remote_pull".to_string(),
        code: "codepull".to_string(),
        ..Default::default()
    }
}

pub fn mock_test_remote_pull() -> MockData {
    let mut result = MockData::default();
    result.names.push(mock_name_store_remote_pull());
    result.stores.push(mock_store_remote_pull());
    result
}
