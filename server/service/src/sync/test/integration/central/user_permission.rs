use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullDeleteRecord, PullDeleteRecordTable, PullUpsertRecord},
};

use repository::{Language, Permission, UserAccountRow, UserPermissionRow};
use serde_json::json;
use util::uuid::uuid;

pub(crate) struct UserPermissionTester;

impl SyncRecordTester for UserPermissionTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let store_id = new_site_properties.store_id.clone();

        let user = UserAccountRow {
            id: "1234-56789-0000".to_string(),
            username: "test_user".to_string(),
            hashed_password: "d74ff0ee8da3b9806b18c877dbf29bbde50b5bd8e4dad7a3a725000feb82e8f1"
                .to_string(),
            email: None,
            language: Language::English,
        };

        let user_json = json!({
            "ID": user.id,
            "name": user.username,
            "active": true,
            "password": "pass",
            "date_created": "2023-03-24",
            "type": {
                "types": "desktop"
            }
        });

        let user_store_json = json!({
            "ID": uuid(),
            "user_ID": user.id,
            "store_ID": store_id,
            "can_login": true,
            "store_default": false
        });

        let user_permission_row_1 = UserPermissionRow {
            id: uuid(),
            user_id: user.id.clone(),
            store_id: Some(store_id.clone()),
            permission: Permission::DocumentMutate,
            context: Some("some program".to_string()),
        };
        let user_permission_row_1_json = json!({
            "ID": user_permission_row_1.id,
            "user_ID": user_permission_row_1.user_id,
            "store_ID": user_permission_row_1.store_id,
            "permission": "DocumentMutate",
            "context_ID": user_permission_row_1.context
        });

        let user_permission_row_2 = UserPermissionRow {
            id: uuid(),
            user_id: user.id.clone(),
            store_id: Some(store_id),
            permission: Permission::DocumentQuery,
            context: Some("some program".to_string()),
        };
        let user_permission_row_2_json = json!({
            "ID": user_permission_row_2.id,
            "user_ID": user_permission_row_2.user_id,
            "store_ID": user_permission_row_2.store_id,
            "permission": "DocumentQuery",
            "context_ID": user_permission_row_2.context
        });

        result.push(TestStepData {
            central_upsert: json!({
                "user": [user_json],
                "user_store": [user_store_json],
                "om_user_permission": [user_permission_row_1_json, user_permission_row_2_json],
            }),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::UserPermission(user_permission_row_1.clone()),
                PullUpsertRecord::UserPermission(user_permission_row_2),
            ]),
        });

        // STEP 2 - deletes
        // result.push(TestStepData {
        //     central_upsert: json!({}),
        //     central_delete: json!({
        //         "om_user_permission": [user_permission_row_1_json],
        //     }),
        //     integration_records: IntegrationRecords::from_deletes(vec![PullDeleteRecord {
        //         id: user_permission_row_1.id,
        //         table: PullDeleteRecordTable::UserPermission,
        //     }]),
        // });
        result
    }
}
