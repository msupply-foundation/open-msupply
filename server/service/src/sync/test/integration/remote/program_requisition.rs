use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullDeleteRecord, PullDeleteRecordTable, PullUpsertRecord},
};
use repository::{
    MasterListNameJoinRow, MasterListRow, NameTagRow, PeriodScheduleRow,
    ProgramRequisitionOrderTypeRow, ProgramRequisitionSettingsRow, ProgramRow,
};

use serde_json::json;
use util::uuid::uuid;

pub(crate) struct ProgramRequisitionTester;

impl SyncRecordTester for ProgramRequisitionTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let period_schedule1 = PeriodScheduleRow {
            id: uuid(),
            name: "Weekly".to_string(),
        };
        let period_schedule_json1 = json!({
            "ID": period_schedule1.id,
            "name": period_schedule1.name,
        });

        let period_schedule2 = PeriodScheduleRow {
            id: uuid(),
            name: "Monthly".to_string(),
        };
        let period_schedule_json2 = json!({
            "ID": period_schedule2.id,
            "name": period_schedule2.name,
        });

        let name_tag1 = NameTagRow {
            id: uuid(),
            name: uuid(),
        };
        let name_tag_json1 = json!({
            "ID": name_tag1.id,
            "description": name_tag1.name,
        });
        let name_tag2 = NameTagRow {
            id: uuid(),
            name: uuid(),
        };
        let name_tag_json2 = json!({
            "ID": name_tag2.id,
            "description": name_tag2.name,
        });

        let master_list_row = MasterListRow {
            id: uuid(),
            name: uuid(),
            code: uuid(),
            description: uuid(),
            is_active: true,
        };
        let master_list_json = json!({
        "ID": master_list_row.id,
        "description":  master_list_row.name,
        "code": master_list_row.code,
        "note": master_list_row.description,
        "isProgram": true,
        "programSettings": {
            "elmisCode": "",
            "storeTags": {
                &name_tag1.name: {
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
                        "periodScheduleName": "Weekly"
                    },
                &name_tag2.name: {
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
                    }
                }
            }
        });

        let master_list_name_join_row = MasterListNameJoinRow {
            id: uuid(),
            master_list_id: master_list_row.id.clone(),
            name_link_id: new_site_properties.name_id.clone(),
        };
        let master_list_name_join_json = json!({
            "ID": master_list_name_join_row.id,
            "list_master_ID":  master_list_name_join_row.master_list_id,
            "name_ID": master_list_name_join_row.name_link_id,
        });

        let program = ProgramRow {
            id: master_list_row.id.clone(),
            name: master_list_row.name.clone(),
            master_list_id: master_list_row.id.clone(),
            context_id: master_list_row.id.clone(),
        };

        let program_requisition_settings1 = ProgramRequisitionSettingsRow {
            id: master_list_row.id.clone() + &name_tag1.id,
            name_tag_id: name_tag1.id.clone(),
            program_id: master_list_row.id.clone(),
            period_schedule_id: period_schedule1.id.clone(),
        };

        let program_requisition_settings2 = ProgramRequisitionSettingsRow {
            id: master_list_row.id.clone() + &name_tag2.id,
            name_tag_id: name_tag2.id.clone(),
            program_id: master_list_row.id.clone(),
            period_schedule_id: period_schedule2.id.clone(),
        };

        let order_type1 = ProgramRequisitionOrderTypeRow {
            id: program_requisition_settings1.id.clone() + "New order 1",
            program_requisition_settings_id: program_requisition_settings1.id.clone(),
            name: "New order 1".to_string(),
            threshold_mos: 3.0,
            max_mos: 3.0,
            max_order_per_period: 1,
        };

        let order_type2 = ProgramRequisitionOrderTypeRow {
            id: program_requisition_settings1.id.clone() + "New order 2",
            program_requisition_settings_id: program_requisition_settings1.id.clone(),
            name: "New order 2".to_string(),
            threshold_mos: 3.0,
            max_mos: 3.0,
            max_order_per_period: 1,
        };

        let order_type3 = ProgramRequisitionOrderTypeRow {
            id: program_requisition_settings2.id.clone() + "New order 1",
            program_requisition_settings_id: program_requisition_settings2.id.clone(),
            name: "New order 1".to_string(),
            threshold_mos: 4.0,
            max_mos: 4.0,
            max_order_per_period: 1,
        };

        let master_list_row2 = MasterListRow {
            id: uuid(),
            name: uuid(),
            code: uuid(),
            description: uuid(),
            is_active: true,
        };
        let master_list_json2 = json!({
        "ID": master_list_row2.id,
        "description":  master_list_row2.name,
        "code": master_list_row2.code,
        "note": master_list_row2.description,
        "isProgram": true,
        "programSettings": {
            "elmisCode": "",
            "storeTags": {
                &name_tag1.name: {
                    "orderTypes": [],
                    "periodScheduleName": "Weekly"
                    }
                }
        }});

        let master_list_name_join_row2 = MasterListNameJoinRow {
            id: uuid(),
            master_list_id: master_list_row2.id.clone(),
            name_link_id: new_site_properties.name_id.clone(),
        };
        let master_list_name_join_json2 = json!({
            "ID": master_list_name_join_row2.id,
            "list_master_ID":  master_list_name_join_row2.master_list_id,
            "name_ID": master_list_name_join_row2.name_link_id,
        });

        let program2 = ProgramRow {
            id: master_list_row2.id.clone(),
            name: master_list_row2.name.clone(),
            master_list_id: master_list_row2.id.clone(),
            context_id: master_list_row2.id.clone(),
        };

        let program_requisition_settings3 = ProgramRequisitionSettingsRow {
            id: master_list_row2.id.clone() + &name_tag1.id,
            name_tag_id: name_tag1.id.clone(),
            program_id: master_list_row2.id.clone(),
            period_schedule_id: period_schedule1.id.clone(),
        };

        result.push(TestStepData {
            central_upsert: json!({
                "periodSchedule": [period_schedule_json1, period_schedule_json2],
                "name_tag": [name_tag_json1, name_tag_json2],
                "list_master": [master_list_json, master_list_json2],
                "list_master_name_join": [master_list_name_join_json, master_list_name_join_json2],
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::PeriodSchedule(period_schedule1.clone()),
                PullUpsertRecord::PeriodSchedule(period_schedule2),
                PullUpsertRecord::NameTag(name_tag1),
                PullUpsertRecord::NameTag(name_tag2),
                PullUpsertRecord::MasterList(master_list_row.clone()),
                PullUpsertRecord::MasterList(master_list_row2),
                PullUpsertRecord::MasterListNameJoin(master_list_name_join_row),
                PullUpsertRecord::MasterListNameJoin(master_list_name_join_row2),
                PullUpsertRecord::Program(program),
                PullUpsertRecord::Program(program2),
                PullUpsertRecord::ProgramRequisitionSettings(program_requisition_settings1.clone()),
                PullUpsertRecord::ProgramRequisitionSettings(program_requisition_settings2.clone()),
                PullUpsertRecord::ProgramRequisitionSettings(program_requisition_settings3),
                PullUpsertRecord::ProgramRequisitionOrderType(order_type1.clone()),
                PullUpsertRecord::ProgramRequisitionOrderType(order_type2.clone()),
                PullUpsertRecord::ProgramRequisitionOrderType(order_type3.clone()),
            ]),
        });

        // STEP 2 - mutate from central
        let upsert_name_tag = NameTagRow {
            id: uuid(),
            name: uuid(),
        };
        let upsert_name_tag_json = json!({
            "ID": upsert_name_tag.id,
            "description": upsert_name_tag.name,
        });

        let upsert_master_list_json = json!({
        "ID": master_list_row.id,
        "description":  master_list_row.name,
        "code": master_list_row.code,
        "note": master_list_row.description,
        "isProgram": true,
        "programSettings": {
            "elmisCode": "",
            "storeTags": {
                &upsert_name_tag.name: {
                    "orderTypes": [
                        {
                            "isEmergency": false,
                            "maxEmergencyOrders": "",
                            "maxMOS": 6,
                            "maxOrdersPerPeriod": 1,
                            "name": "Changed order 1",
                            "thresholdMOS": 3,
                            "type": "Order type"
                        }],
                        "periodScheduleName": "Weekly"
                    }
                }
            }});

        let upsert_program_requisition_settings = ProgramRequisitionSettingsRow {
            id: master_list_row.id.clone() + &upsert_name_tag.id,
            name_tag_id: upsert_name_tag.id.clone(),
            program_id: master_list_row.id.clone(),
            period_schedule_id: period_schedule1.id.clone(),
        };

        let upsert_order_type = ProgramRequisitionOrderTypeRow {
            id: upsert_program_requisition_settings.id.clone() + "Changed order 1",
            program_requisition_settings_id: upsert_program_requisition_settings.id.clone(),
            name: "Changed order 1".to_string(),
            threshold_mos: 3.0,
            max_mos: 6.0,
            max_order_per_period: 1,
        };

        let upserts = vec![
            PullUpsertRecord::NameTag(upsert_name_tag),
            PullUpsertRecord::ProgramRequisitionSettings(upsert_program_requisition_settings),
            PullUpsertRecord::ProgramRequisitionOrderType(upsert_order_type),
        ];

        let deletes = vec![
            PullDeleteRecord {
                id: order_type1.id,
                table: PullDeleteRecordTable::ProgramRequisitionOrderType,
            },
            PullDeleteRecord {
                id: order_type2.id,
                table: PullDeleteRecordTable::ProgramRequisitionOrderType,
            },
            PullDeleteRecord {
                id: order_type3.id,
                table: PullDeleteRecordTable::ProgramRequisitionOrderType,
            },
            PullDeleteRecord {
                id: program_requisition_settings1.id,
                table: PullDeleteRecordTable::ProgramRequisitionSettings,
            },
            PullDeleteRecord {
                id: program_requisition_settings2.id,
                table: PullDeleteRecordTable::ProgramRequisitionSettings,
            },
        ];

        result.push(TestStepData {
            central_upsert: json!({
                "name_tag": [upsert_name_tag_json],
                "list_master": [upsert_master_list_json],
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords { upserts, deletes },
        });

        result
    }
}
