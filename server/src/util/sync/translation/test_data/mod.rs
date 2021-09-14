pub mod item;
pub mod master_list;
pub mod master_list_line;
pub mod master_list_name_join;
pub mod name;
pub mod store;

use crate::{
    database::schema::{
        ItemRow, MasterListLineRow, MasterListNameJoinRow, MasterListRow, NameRow, StoreRow,
    },
    util::sync::translation::SyncRecord,
};

#[allow(dead_code)]
#[derive(Debug)]
pub enum TestSyncDataRecord {
    Item(Option<ItemRow>),
    Store(Option<StoreRow>),
    Name(Option<NameRow>),
    MasterList(Option<MasterListRow>),
    MasterListLine(Option<MasterListLineRow>),
    MasterListNameJoin(Option<MasterListNameJoinRow>),
}
#[allow(dead_code)]
pub struct TestSyncRecord {
    pub sync_record: SyncRecord,
    pub translated_record: TestSyncDataRecord,
    pub identifier: &'static str,
}

#[allow(dead_code)]
pub struct SyncRecordDefinition {
    pub id: &'static str,
    pub data: &'static str,
    pub identifier: &'static str,
}
