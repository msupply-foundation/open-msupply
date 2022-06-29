use crate::sync::translation_central::test_data::{TestSyncDataRecord, TestSyncRecord};
use repository::{MasterListLineRow, SyncBufferRow};
use util::inline_init;

const MASTER_LIST_LINE_1: &'static str = r#"{
    "ID": "9B02D0770B544BD1AC7DB99BB85FCDD5",
    "item_master_ID": "87027C44835B48E6989376F42A58F7E3",
    "item_ID": "8F252B5884B74888AAB73A0D42C09E7F",
    "imprest_quan": 0,
    "order_number": 1,
    "price": 0
  }"#;

#[allow(dead_code)]
const RECORD_TYPE: &'static str = "list_master_line";
#[allow(dead_code)]
pub fn get_test_master_list_line_records() -> Vec<TestSyncRecord> {
    vec![TestSyncRecord {
        translated_record: TestSyncDataRecord::MasterListLine(Some(MasterListLineRow {
            id: "9B02D0770B544BD1AC7DB99BB85FCDD5".to_owned(),
            item_id: "8F252B5884B74888AAB73A0D42C09E7F".to_owned(),
            master_list_id: "87027C44835B48E6989376F42A58F7E3".to_owned(),
        })),
        identifier: "Master list line",
        central_sync_buffer_row: inline_init(|r: &mut SyncBufferRow| {
            r.table_name = RECORD_TYPE.to_owned();
            r.record_id = "9B02D0770B544BD1AC7DB99BB85FCDD5".to_owned();
            r.data = MASTER_LIST_LINE_1.to_owned();
        }),
    }]
}
