use crate::{
    database::schema::{MasterListNameJoinRow, MasterListRow, NameRow},
    util::sync::translation::{
        test_data::{TestSyncDataRecord, TestSyncRecord},
        SyncRecord, SyncType,
    },
};
#[allow(dead_code)]
const RECORD_TYPE: &'static str = "list_master_name_join";
#[allow(dead_code)]
pub fn get_test_master_list_name_join_records() -> Vec<TestSyncRecord> {
    vec![TestSyncRecord {
        translated_record: TestSyncDataRecord::MasterListNameJoin(Some(MasterListNameJoinRow {
            id: "A7A06D78361041448B836857ED4330C4".to_owned(),
            master_list_id: "87027C44835B48E6989376F42A58F7E3".to_owned(),
            name_id: "1FB32324AF8049248D929CFB35F255BA".to_owned(),
        })),
        identifier: "Master list",
        sync_record: SyncRecord {
            record_id: "8F252B5884B74888AAB73A0D42C09E7F".to_owned(),
            data: r#"{
              "ID": "A7A06D78361041448B836857ED4330C4",
              "description": "Gryffindor All Items ",
              "name_ID": "1FB32324AF8049248D929CFB35F255BA",
              "list_master_ID": "87027C44835B48E6989376F42A58F7E3",
              "include_web": false,
              "include_imprest": false,
              "include_stock_hist": false,
              "price_list": false
            }"#
            .to_owned(),
            sync_type: SyncType::Insert,
            record_type: RECORD_TYPE.to_owned(),
        },
    }]
}
