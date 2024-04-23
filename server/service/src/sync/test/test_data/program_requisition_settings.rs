use repository::{
    mock::{
        mock_name_tag_1, mock_name_tag_2, mock_name_tag_3, mock_period_schedule_1,
        mock_period_schedule_2,
    },
    ContextRow, ProgramRequisitionOrderTypeRow, ProgramRequisitionSettingsRow, ProgramRow,
    SyncBufferAction, SyncBufferRow,
};

use crate::sync::{
    test::TestSyncIncomingRecord,
    translations::{IntegrationOperation, PullTranslateResult},
};

const TABLE_NAME: &str = "list_master";

const MASTER_LIST_WITH_PROGRAM_1: (&str, &str) = (
    "program_test",
    r#"{
    "ID": "program_test",
    "description": "Program Test 01",
    "date_created": "2017-08-17",
    "created_by_user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
    "note": "note 3",
    "gets_new_items": false,
    "tags": null,
    "isProgram": true,
    "inactive": false,
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
                    },
                    {
                        "isEmergency": false,
                        "maxEmergencyOrders": "",
                        "maxMOS": 3,
                        "maxOrdersPerPeriod": 1,
                        "name": "New order 2",
                        "thresholdMOS": 3,
                        "type": "Order type"
                    }
                ],
                "periodScheduleName": "Monthly"
            },
            "NewProgramTag2": {
                "orderTypes": [
                    {
                        "isEmergency": false,
                        "maxEmergencyOrders": "",
                        "maxMOS": 4,
                        "maxOrdersPerPeriod": 1,
                        "name": "New order 1",
                        "thresholdMOS": 4,
                        "type": "Order type"
                    }
                ],
                "periodScheduleName": "Monthly"
            },
            "NewProgramTag3": {
                "orderTypes": [
                    {
                        "isEmergency": false,
                        "maxEmergencyOrders": "",
                        "maxMOS": 2,
                        "maxOrdersPerPeriod": 3,
                        "name": "New order 1",
                        "thresholdMOS": 2,
                        "type": "Order type"
                    }
                ],
                "periodScheduleName": "Weekly"
            }
        }
    },
    "code": "",
    "isPatientList": false,
    "is_hiv": false,
    "isSupplierHubCatalog": false
}"#,
);

const MASTER_LIST_WITH_PROGRAM_2: (&str, &str) = (
    "program_test_2",
    r#"{
    "ID": "program_test_2",
    "description": "Program Test 02",
    "date_created": "2017-08-17",
    "created_by_user_ID": "0763E2E3053D4C478E1E6B6B03FEC207",
    "note": "note 4",
    "gets_new_items": false,
    "tags": null,
    "isProgram": true,
    "inactive": false,
    "programSettings": {
        "elmisCode": "",
        "storeTags": {
            "NewProgramTag1": {
                "orderTypes": [],
                "periodScheduleName": "Monthly"
            }
        }
    },
    "code": "",
    "isPatientList": false,
    "is_hiv": false,
    "isSupplierHubCatalog": false
}"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord {
            translated_record: PullTranslateResult::IntegrationOperations(vec![
                IntegrationOperation::upsert(ContextRow {
                    id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned(),
                    name: "Program Test 01".to_owned(),
                }),
                IntegrationOperation::upsert(ProgramRow {
                    id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned(),
                    name: "Program Test 01".to_owned(),
                    master_list_id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned(),
                    context_id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned(),
                }),
                IntegrationOperation::upsert(ProgramRequisitionSettingsRow {
                    id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned() + &mock_name_tag_1().id,
                    name_tag_id: mock_name_tag_1().id,
                    program_id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned(),
                    period_schedule_id: mock_period_schedule_1().id,
                }),
                IntegrationOperation::upsert(ProgramRequisitionOrderTypeRow {
                    id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned()
                        + &mock_name_tag_1().id
                        + "New order 1",
                    program_requisition_settings_id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned()
                        + &mock_name_tag_1().id,
                    name: "New order 1".to_owned(),
                    threshold_mos: 3.0,
                    max_mos: 3.0,
                    max_order_per_period: 1,
                }),
                IntegrationOperation::upsert(ProgramRequisitionOrderTypeRow {
                    id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned()
                        + &mock_name_tag_1().id
                        + "New order 2",
                    program_requisition_settings_id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned()
                        + &mock_name_tag_1().id,
                    name: "New order 2".to_owned(),
                    threshold_mos: 3.0,
                    max_mos: 3.0,
                    max_order_per_period: 1,
                }),
                IntegrationOperation::upsert(ProgramRequisitionSettingsRow {
                    id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned() + &mock_name_tag_2().id,
                    name_tag_id: mock_name_tag_2().id,
                    program_id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned(),
                    period_schedule_id: mock_period_schedule_1().id,
                }),
                IntegrationOperation::upsert(ProgramRequisitionOrderTypeRow {
                    id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned()
                        + &mock_name_tag_2().id
                        + "New order 1",
                    program_requisition_settings_id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned()
                        + &mock_name_tag_2().id,
                    name: "New order 1".to_owned(),
                    threshold_mos: 4.0,
                    max_mos: 4.0,
                    max_order_per_period: 1,
                }),
                IntegrationOperation::upsert(ProgramRequisitionSettingsRow {
                    id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned() + &mock_name_tag_3().id,
                    name_tag_id: mock_name_tag_3().id,
                    program_id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned(),
                    period_schedule_id: mock_period_schedule_2().id,
                }),
                IntegrationOperation::upsert(ProgramRequisitionOrderTypeRow {
                    id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned()
                        + &mock_name_tag_3().id
                        + "New order 1",
                    program_requisition_settings_id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned()
                        + &mock_name_tag_3().id,
                    name: "New order 1".to_owned(),
                    threshold_mos: 2.0,
                    max_mos: 2.0,
                    max_order_per_period: 3,
                }),
            ]),
            sync_buffer_row: SyncBufferRow {
                table_name: TABLE_NAME.to_string(),
                record_id: MASTER_LIST_WITH_PROGRAM_1.0.to_owned(),
                data: MASTER_LIST_WITH_PROGRAM_1.1.to_owned(),
                action: SyncBufferAction::Upsert,
                ..Default::default()
            },
            extra_data: None,
        },
        TestSyncIncomingRecord {
            translated_record: PullTranslateResult::IntegrationOperations(vec![
                IntegrationOperation::upsert(ContextRow {
                    id: MASTER_LIST_WITH_PROGRAM_2.0.to_owned(),
                    name: "Program Test 02".to_owned(),
                }),
                IntegrationOperation::upsert(ProgramRow {
                    id: MASTER_LIST_WITH_PROGRAM_2.0.to_owned(),
                    name: "Program Test 02".to_owned(),
                    master_list_id: MASTER_LIST_WITH_PROGRAM_2.0.to_owned(),
                    context_id: MASTER_LIST_WITH_PROGRAM_2.0.to_owned(),
                }),
                IntegrationOperation::upsert(ProgramRequisitionSettingsRow {
                    id: MASTER_LIST_WITH_PROGRAM_2.0.to_owned() + &mock_name_tag_1().id,
                    name_tag_id: mock_name_tag_1().id,
                    program_id: MASTER_LIST_WITH_PROGRAM_2.0.to_owned(),
                    period_schedule_id: mock_period_schedule_1().id,
                }),
            ]),
            sync_buffer_row: SyncBufferRow {
                table_name: TABLE_NAME.to_string(),
                record_id: MASTER_LIST_WITH_PROGRAM_2.0.to_owned(),
                data: MASTER_LIST_WITH_PROGRAM_2.1.to_owned(),
                action: SyncBufferAction::Upsert,
                ..Default::default()
            },
            extra_data: None,
        },
    ]
}
