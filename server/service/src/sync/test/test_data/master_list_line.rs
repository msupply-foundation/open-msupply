use repository::{MasterListLineRow, MasterListLineRowDelete};

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "list_master_line";

const MASTER_LIST_LINE_1: (&str, &str) = (
    "9B02D0770B544BD1AC7DB99BB85FCDD5",
    r#"{
    "ID": "9B02D0770B544BD1AC7DB99BB85FCDD5",
    "item_master_ID": "87027C44835B48E6989376F42A58F7E3",
    "item_ID": "8F252B5884B74888AAB73A0D42C09E7F",
    "imprest_quan": 0,
    "order_number": 1,
    "price": 0
  }"#,
);

const MASTER_LIST_LINE_2: (&str, &str) = (
    "master_list_line_2",
    r#"{
    "ID": "master_list_line_2",
    "item_master_ID": "87027C44835B48E6989376F42A58F7E3",
    "item_ID": "8F252B5884B74888AAB73A0D42C09E7F",
    "imprest_quan": 0,
    "order_number": 2,
    "price": 0
  }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            MASTER_LIST_LINE_1,
            MasterListLineRow {
                id: "9B02D0770B544BD1AC7DB99BB85FCDD5".to_owned(),
                item_link_id: "8F252B5884B74888AAB73A0D42C09E7F".to_owned(),
                master_list_id: "87027C44835B48E6989376F42A58F7E3".to_owned(),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            MASTER_LIST_LINE_2,
            MasterListLineRow {
                id: "master_list_line_2".to_owned(),
                item_link_id: "8F252B5884B74888AAB73A0D42C09E7F".to_owned(),
                master_list_id: "87027C44835B48E6989376F42A58F7E3".to_owned(),
            },
        ),
    ]
}

pub fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        MASTER_LIST_LINE_2.0,
        MasterListLineRowDelete(MASTER_LIST_LINE_2.0.to_string()),
    )]
}
