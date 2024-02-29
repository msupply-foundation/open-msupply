use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};
use repository::{MasterListLineRow, MasterListNameJoinRow, MasterListRow};

use serde_json::json;
use util::uuid::uuid;

pub(crate) struct MasterListTester;

impl SyncRecordTester for MasterListTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let master_list_row1 = MasterListRow {
            id: uuid(),
            name: uuid(),
            code: uuid(),
            description: "".to_string(),
            is_active: false,
        };
        let master_list_json1 = json!({
            "ID": master_list_row1.id,
            "description":  master_list_row1.name,
            "code": master_list_row1.code,
            "inactive": true,
        });

        let master_list_name_join_row1 = MasterListNameJoinRow {
            id: uuid(),
            master_list_id: master_list_row1.id.clone(),
            name_link_id: new_site_properties.name_id.clone(),
        };
        let master_list_name_join_json1 = json!({
            "ID": master_list_name_join_row1.id,
            "list_master_ID":  master_list_name_join_row1.master_list_id,
            "name_ID": master_list_name_join_row1.name_link_id,
        });

        let master_list_row2 = MasterListRow {
            id: uuid(),
            name: uuid(),
            code: uuid(),
            description: uuid(),
            is_active: false,
        };
        let master_list_json2 = json!({
            "ID": master_list_row2.id,
            "description":  master_list_row2.name,
            "code": master_list_row2.code,
            "note": master_list_row2.description,
            "inactive": true,
        });

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

        let item_id = uuid();
        let master_list_line_row = MasterListLineRow {
            id: uuid(),
            item_link_id: item_id.clone(),
            master_list_id: master_list_row1.id.clone(),
        };
        let master_list_line_json = json!({
            "ID": master_list_line_row.id,
            "item_master_ID": master_list_line_row.master_list_id,
            "item_ID":  master_list_line_row.item_link_id,
        });

        result.push(TestStepData {
            central_upsert: json!({
                "list_master": [master_list_json1,master_list_json2],
                "list_master_name_join": [master_list_name_join_json1,master_list_name_join_json2],
                "list_master_line": [master_list_line_json],
                "item": [{"ID": item_id, "type_of": "general"}]
            }),
            integration_records: vec![
                IntegrationOperation::upsert(master_list_row1),
                IntegrationOperation::upsert(master_list_row2),
                IntegrationOperation::upsert(master_list_name_join_row1),
                IntegrationOperation::upsert(master_list_name_join_row2),
                IntegrationOperation::upsert(master_list_line_row),
            ],
            ..Default::default()
        });

        result
    }
}
