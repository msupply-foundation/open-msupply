use crate::sync::{
    test::TestSyncPullRecord,
    translations::{LegacyTableName, PullUpsertRecord, PullDeleteRecordTable},
};
use repository::MasterListNameJoinRow;

const LIST_MASTER_NAME_JOIN_1: (&'static str, &'static str) = (
    "A7A06D78361041448B836857ED4330C4",
    r#"{
    "ID": "A7A06D78361041448B836857ED4330C4",
    "description": "Gryffindor All Items ",
    "name_ID": "1FB32324AF8049248D929CFB35F255BA",
    "list_master_ID": "87027C44835B48E6989376F42A58F7E3",
    "include_web": false,
    "include_imprest": false,
    "include_stock_hist": false,
    "price_list": false
  }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_upsert(
        LegacyTableName::LIST_MASTER_NAME_JOIN,
        LIST_MASTER_NAME_JOIN_1,
        PullUpsertRecord::MasterListNameJoin(MasterListNameJoinRow {
            id: LIST_MASTER_NAME_JOIN_1.0.to_owned(),
            master_list_id: "87027C44835B48E6989376F42A58F7E3".to_owned(),
            name_id: "1FB32324AF8049248D929CFB35F255BA".to_owned(),
        }),
    )]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_delete(
        LegacyTableName::LIST_MASTER_NAME_JOIN,
        LIST_MASTER_NAME_JOIN_1.0,
        PullDeleteRecordTable::MasterListNameJoin,
    )]
}
