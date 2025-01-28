use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};

use repository::{ContextRow, Permission, UserPermissionRow, UserPermissionRowDelete};
use serde_json::json;
use util::uuid::uuid;

pub(crate) struct UserPermissionTester;

impl SyncRecordTester for UserPermissionTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let store_id = new_site_properties.store_id.clone();

        let context = ContextRow {
            id: "some context".to_string(),
            name: "".to_string(),
        };
        let context_json = json!({
            "ID": context.id.clone(),
            "description": context.name.clone(),
            "isProgram": true,
            "code": "",
            "note": "",
            "programSettings": { "storeTags": {} },
        });
        let user_permission_row_1 = UserPermissionRow {
            id: uuid(),
            user_id: "test_user".to_string(),
            store_id: Some(store_id.clone()),
            permission: Permission::DocumentMutate,
            context_id: Some(context.id.clone()),
        };
        let user_permission_row_1_json = json!({
            "ID": user_permission_row_1.id,
            "user_ID": user_permission_row_1.user_id,
            "store_ID": user_permission_row_1.store_id,
            "permission": "DocumentMutate",
            "context_ID": user_permission_row_1.context_id
        });

        let user_permission_row_2 = UserPermissionRow {
            id: uuid(),
            user_id: "test_user".to_string(),
            store_id: Some(store_id),
            permission: Permission::DocumentQuery,
            context_id: Some(context.id.clone()),
        };
        let user_permission_row_2_json = json!({
            "ID": user_permission_row_2.id,
            "user_ID": user_permission_row_2.user_id,
            "store_ID": user_permission_row_2.store_id,
            "permission": "DocumentQuery",
            "context_ID": user_permission_row_2.context_id,
        });

        result.push(TestStepData {
            central_upsert: json!({
                "list_master": [context_json],
                "om_user_permission": [user_permission_row_1_json, user_permission_row_2_json],
            }),
            integration_records: vec![
                IntegrationOperation::upsert(user_permission_row_1.clone()),
                IntegrationOperation::upsert(user_permission_row_2),
            ],
            ..Default::default()
        });

        // STEP 2 - deletes
        result.push(TestStepData {
            central_delete: json!({
                "om_user_permission": [user_permission_row_1.id],
            }),
            integration_records: vec![IntegrationOperation::delete(UserPermissionRowDelete(
                user_permission_row_1.id,
            ))],
            ..Default::default()
        });
        result
    }
}
