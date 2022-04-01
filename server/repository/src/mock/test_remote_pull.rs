use util::inline_init;

use crate::schema::{NameRow, StoreRow};

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
    StoreRow {
        id: String::from("store_remote_pull"),
        name_id: String::from("name_store_remote_pull"),
        code: String::from("codepull"),
    }
}

pub fn mock_test_remote_pull() -> MockData {
    let mut result = MockData::default();
    result.names.push(mock_name_store_remote_pull());
    result.stores.push(mock_store_remote_pull());
    result
}
