use crate::sync::translation_central::test_data::{TestSyncDataRecord, TestSyncRecord};
use repository::{schema::CentralSyncBufferRow, MasterListRow};

const MASTER_LIST_1: (&'static str, &'static str) = (
    "87027C44835B48E6989376F42A58F7E3",
    r#"{
    "ID": "87027C44835B48E6989376F42A58F7E3",
    "description": "District Store",
    "date_created": "2017-08-17",
    "created_by_user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
    "note": "note 1",
    "gets_new_items": false,
    "tags": null,
    "isProgram": false,
    "programSettings": null,
    "code": "",
    "isPatientList": false,
    "is_hiv": false,
    "isSupplierHubCatalog": false
}"#,
);

const MASTER_LIST_UPSERT_1: (&'static str, &'static str) = (
    "87027C44835B48E6989376F42A58F7E3",
    r#"{
    "ID": "87027C44835B48E6989376F42A58F7E3",
    "description": "District Store 2",
    "date_created": "2017-08-17",
    "created_by_user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
    "note": "note 2",
    "gets_new_items": false,
    "tags": null,
    "isProgram": false,
    "programSettings": null,
    "code": "",
    "isPatientList": false,
    "is_hiv": false,
    "isSupplierHubCatalog": false
}"#,
);

#[allow(dead_code)]
const RECORD_TYPE: &'static str = "list_master";
#[allow(dead_code)]
pub fn get_test_master_list_records() -> Vec<TestSyncRecord> {
    vec![TestSyncRecord {
        translated_record: TestSyncDataRecord::MasterList(Some(MasterListRow {
            id: MASTER_LIST_1.0.to_owned(),
            name: "District Store".to_owned(),
            code: "".to_owned(),
            description: "note 1".to_owned(),
        })),
        identifier: "Master list",
        central_sync_buffer_row: CentralSyncBufferRow {
            id: 400,
            table_name: RECORD_TYPE.to_owned(),
            record_id: MASTER_LIST_1.0.to_owned(),
            data: MASTER_LIST_1.1.to_owned(),
        },
    }]
}
#[allow(dead_code)]
pub fn get_test_master_list_upsert_records() -> Vec<TestSyncRecord> {
    vec![TestSyncRecord {
        translated_record: TestSyncDataRecord::MasterList(Some(MasterListRow {
            id: MASTER_LIST_UPSERT_1.0.to_owned(),
            name: "District Store 2".to_owned(),
            code: "".to_owned(),
            description: "note 2".to_owned(),
        })),
        identifier: "Master list upsert",
        central_sync_buffer_row: CentralSyncBufferRow {
            id: 500,
            table_name: RECORD_TYPE.to_owned(),
            record_id: MASTER_LIST_UPSERT_1.0.to_owned(),
            data: MASTER_LIST_UPSERT_1.1.to_owned(),
        },
    }]
}
