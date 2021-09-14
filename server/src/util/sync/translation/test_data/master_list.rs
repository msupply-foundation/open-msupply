use crate::{
    database::schema::MasterListRow,
    util::sync::translation::{
        test_data::{TestSyncDataRecord, TestSyncRecord},
        SyncRecord, SyncType,
    },
};
#[allow(dead_code)]
const RECORD_TYPE: &'static str = "list_master";
#[allow(dead_code)]
pub fn get_test_master_list_records() -> Vec<TestSyncRecord> {
    vec![TestSyncRecord {
        translated_record: TestSyncDataRecord::MasterList(Some(MasterListRow {
            id: "87027C44835B48E6989376F42A58F7E3".to_owned(),
            name: "".to_owned(),
            code: "".to_owned(),
            description: "District Store".to_owned(),
        })),
        identifier: "Master list",
        sync_record: SyncRecord {
            record_id: "8F252B5884B74888AAB73A0D42C09E7F".to_owned(),
            data: r#"{
                "ID": "87027C44835B48E6989376F42A58F7E3",
                "description": "District Store",
                "date_created": "2017-08-17",
                "created_by_user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
                "note": "",
                "gets_new_items": false,
                "tags": null,
                "isProgram": false,
                "programSettings": null,
                "code": "",
                "isPatientList": false,
                "is_hiv": false,
                "isSupplierHubCatalog": false
            }"#
            .to_owned(),
            sync_type: SyncType::Insert,
            record_type: RECORD_TYPE.to_owned(),
        },
    }]
}
#[allow(dead_code)]
pub fn get_test_master_list_upsert_records() -> Vec<TestSyncRecord> {
    vec![TestSyncRecord {
        translated_record: TestSyncDataRecord::MasterList(Some(MasterListRow {
            id: "87027C44835B48E6989376F42A58F7E3".to_owned(),
            name: "".to_owned(),
            code: "".to_owned(),
            description: "District Store 2".to_owned(),
        })),
        identifier: "Master list upsert",
        sync_record: SyncRecord {
            record_id: "87027C44835B48E6989376F42A58F7E3".to_owned(),
            data: r#"{
                "ID": "87027C44835B48E6989376F42A58F7E3",
                "description": "District Store 2",
                "date_created": "2017-08-17",
                "created_by_user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
                "note": "",
                "gets_new_items": false,
                "tags": null,
                "isProgram": false,
                "programSettings": null,
                "code": "",
                "isPatientList": false,
                "is_hiv": false,
                "isSupplierHubCatalog": false
            }"#
            .to_owned(),
            sync_type: SyncType::Insert,
            record_type: RECORD_TYPE.to_owned(),
        },
    }]
}
