pub mod item;
pub mod name;
pub mod store;

use crate::{
    database::schema::{ItemRow, NameRow, StoreRow},
    util::sync::translation::SyncRecord,
};

#[allow(dead_code)]
#[derive(Debug)]
pub enum TestSyncDataRecord {
    Item(Option<ItemRow>),
    Store(Option<StoreRow>),
    Name(Option<NameRow>),
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
