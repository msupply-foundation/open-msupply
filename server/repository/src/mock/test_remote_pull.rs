use util::inline_init;

use crate::{NameRow, StoreRow};

use super::MockData;

pub fn mock_name_store_remote_pull() -> NameRow {
    inline_init(|r: &mut NameRow| {
        r.id = String::from("name_store_remote_pull");
        r.name = String::from("Store for remote pull");
        r.code = String::from("code");
        r.is_supplier = true;
    })
}

// unique store is needed for number tests since number ids are not unique
pub fn mock_store_remote_pull() -> StoreRow {
    inline_init(|s: &mut StoreRow| {
        s.id = "store_remote_pull".to_string();
        s.name_link_id = "name_store_remote_pull".to_string();
        s.code = "codepull".to_string();
    })
}

pub fn mock_test_remote_pull() -> MockData {
    let mut result = MockData::default();
    result.names.push(mock_name_store_remote_pull());
    result.stores.push(mock_store_remote_pull());
    result
}
