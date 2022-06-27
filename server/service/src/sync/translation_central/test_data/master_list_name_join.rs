use crate::sync::translation_central::test_data::{TestSyncDataRecord, TestSyncRecord};
use repository::{CentralSyncBufferRow, MasterListNameJoinRow};

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

#[allow(dead_code)]
const RECORD_TYPE: &'static str = "list_master_name_join";
#[allow(dead_code)]
pub fn get_test_master_list_name_join_records() -> Vec<TestSyncRecord> {
    vec![TestSyncRecord {
        translated_record: TestSyncDataRecord::MasterListNameJoin(Some(MasterListNameJoinRow {
            id: LIST_MASTER_NAME_JOIN_1.0.to_owned(),
            master_list_id: "87027C44835B48E6989376F42A58F7E3".to_owned(),
            name_id: "1FB32324AF8049248D929CFB35F255BA".to_owned(),
        })),
        identifier: "Master list",
        central_sync_buffer_row: CentralSyncBufferRow {
            id: 50,
            table_name: RECORD_TYPE.to_owned(),
            record_id: LIST_MASTER_NAME_JOIN_1.0.to_owned(),
            data: LIST_MASTER_NAME_JOIN_1.1.to_owned(),
        },
    }]
}
