use crate::sync::test::TestSyncIncomingRecord;
use repository::{MasterListNameJoinRow, MasterListNameJoinRowDelete};

const TABLE_NAME: &'static str = "list_master_name_join";

const LIST_MASTER_NAME_JOIN_1: (&'static str, &'static str) = (
    "A7A06D78361041448B836857ED4330C4",
    r#"{
    "ID": "A7A06D78361041448B836857ED4330C4",
    "description": "Gryffindor All Items ",
    "name_ID": "name_store_a",
    "list_master_ID": "87027C44835B48E6989376F42A58F7E3",
    "include_web": false,
    "include_imprest": false,
    "include_stock_hist": false,
    "price_list": false
  }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        TABLE_NAME,
        LIST_MASTER_NAME_JOIN_1,
        MasterListNameJoinRow {
            id: LIST_MASTER_NAME_JOIN_1.0.to_owned(),
            master_list_id: "87027C44835B48E6989376F42A58F7E3".to_owned(),
            name_link_id: "name_store_a".to_owned(),
        },
    )]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        LIST_MASTER_NAME_JOIN_1.0,
        MasterListNameJoinRowDelete(LIST_MASTER_NAME_JOIN_1.0.to_string()),
    )]
}
