use repository::MasterListLineRow;

use crate::sync::test::TestSyncIncomingRecord;

const MASTER_LIST_LINE_1: (&str, &str) = (
    "9B02D0770B544BD1AC7DB99BB85FCDD5",
    r#"{
    "ID": "9B02D0770B544BD1AC7DB99BB85FCDD5",
    "item_master_ID": "item_query_test1",
    "item_ID": "8F252B5884B74888AAB73A0D42C09E7F",
    "imprest_quan": 0,
    "order_number": 1,
    "price": 0
  }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_upsert(
        "list_master_line",
        MASTER_LIST_LINE_1,
        MasterListLineRow {
            id: "9B02D0770B544BD1AC7DB99BB85FCDD5".to_owned(),
            item_link_id: "8F252B5884B74888AAB73A0D42C09E7F".to_owned(),
            master_list_id: "item_query_test1".to_owned(),
        },
    )]
}
