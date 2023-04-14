use repository::{
    mock::{mock_name_tag_1, mock_period_schedule_1},
    MasterListRow, ProgramRequisitionOrderTypeRow, ProgramRequisitionSettingsRow, ProgramRow,
};

use crate::sync::{
    test::TestSyncPullRecord,
    translations::{LegacyTableName, PullDeleteRecordTable, PullUpsertRecord},
};

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
    "isSupplierHubCatalog": false
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
    "isSupplierHubCatalog": false
}"#,
);

const MASTER_LIST_3: (&'static str, &'static str) = (
    "program_test",
    r#"{
    "ID": "program_test",
    "description": "program_test",
    "date_created": "2017-08-17",
    "created_by_user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
    "note": "note 3",
    "gets_new_items": false,
    "tags": null,
    "isProgram": true,
    "programSettings": {
        "elmisCode": "",
        "storeTags": {
            "NewProgramTag1": {
                "orderTypes": [
                    {
                        "isEmergency": false,
                        "maxEmergencyOrders": "",
                        "maxMOS": 3,
                        "maxOrdersPerPeriod": 1,
                        "name": "New order 1",
                        "thresholdMOS": 3,
                        "type": "Order type"
                    }
                ],
                "periodScheduleName": "Bi Weekly"
            }
        }
    },
    "code": "",
    "isPatientList": false,
    "is_hiv": false,
    "isSupplierHubCatalog": false
}"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::LIST_MASTER,
            MASTER_LIST_1,
            PullUpsertRecord::MasterList(MasterListRow {
                id: MASTER_LIST_1.0.to_owned(),
                name: "District Store".to_owned(),
                code: "".to_owned(),
                description: "note 1".to_owned(),
            }),
        ),
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::LIST_MASTER,
            MASTER_LIST_2,
            PullUpsertRecord::MasterList(MasterListRow {
                id: MASTER_LIST_2.0.to_owned(),
                name: "District Store 2".to_owned(),
                code: "".to_owned(),
                description: "note 2".to_owned(),
            }),
        ),
        TestSyncPullRecord::new_pull_upserts(
            LegacyTableName::LIST_MASTER,
            MASTER_LIST_3,
            vec![
                PullUpsertRecord::MasterList(MasterListRow {
                    id: MASTER_LIST_3.0.to_owned(),
                    name: "program_test".to_owned(),
                    code: "".to_owned(),
                    description: "note 3".to_owned(),
                }),
                PullUpsertRecord::Program(ProgramRow {
                    id: MASTER_LIST_3.0.to_owned(),
                    name: "program_test".to_owned(),
                }),
                PullUpsertRecord::ProgramRequisitionSettings(ProgramRequisitionSettingsRow {
                    id: "program_test".to_owned() + &mock_name_tag_1().id,
                    name_tag_id: mock_name_tag_1().id,
                    program_id: "program_test".to_owned(),
                    period_schedule_id: mock_period_schedule_1().id,
                }),
                PullUpsertRecord::ProgramRequisitionOrderType(ProgramRequisitionOrderTypeRow {
                    id: "program_test".to_owned() + &mock_name_tag_1().id + "New order 1",
                    program_requisition_settings_id: "program_test".to_owned()
                        + &mock_name_tag_1().id,
                    name: "New order 1".to_owned(),
                    threshold_mos: 3.0,
                    max_mos: 3.0,
                    max_order_per_period: 1.0,
                }),
            ],
        ),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_delete(
        LegacyTableName::LIST_MASTER,
        MASTER_LIST_1.0,
        PullDeleteRecordTable::MasterList,
    )]
}
