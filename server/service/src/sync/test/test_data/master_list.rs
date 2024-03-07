use repository::MasterListRow;

use crate::sync::test::TestFromSyncRecord;

const TABLE_NAME: &'static str = "list_master";

const MASTER_LIST_1: (&'static str, &'static str) = (
    "87027C44835B48E6989376F42A58F7EA",
    r#"{
    "ID": "87027C44835B48E6989376F42A58F7EA",
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
    "isSupplierHubCatalog": false,
    "inactive": true
}"#,
);

const MASTER_LIST_2: (&'static str, &'static str) = (
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
    "isSupplierHubCatalog": false,
    "inactive": false
}"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestFromSyncRecord> {
    vec![
        TestFromSyncRecord::new_pull_upsert(
            TABLE_NAME,
            MASTER_LIST_1,
            MasterListRow {
                id: MASTER_LIST_1.0.to_owned(),
                name: "District Store".to_owned(),
                code: "".to_owned(),
                description: "note 1".to_owned(),
                is_active: false,
            },
        ),
        TestFromSyncRecord::new_pull_upsert(
            TABLE_NAME,
            MASTER_LIST_2,
            MasterListRow {
                id: MASTER_LIST_2.0.to_owned(),
                name: "District Store 2".to_owned(),
                code: "".to_owned(),
                description: "note 2".to_owned(),
                is_active: true,
            },
        ),
    ]
}
