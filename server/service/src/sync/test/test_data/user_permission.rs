use repository::{mock::context_program_a, Permission, UserPermissionRow, UserPermissionRowDelete};

use crate::sync::test::TestFromSyncRecord;

const TABLE_NAME: &'static str = "om_user_permission";

const USER_PERMISSION_1: (&'static str, &'static str) = (
    "user_permission_1",
    r#"{
    "ID": "user_permission_1",
    "user_ID": "user_account_a",
    "store_ID": "store_a",
    "permission": "DocumentQuery",
    "context_ID": "program_a"
}"#,
);

const USER_PERMISSION_2: (&'static str, &'static str) = (
    "user_permission_2",
    r#"{
    "ID": "user_permission_2",
    "user_ID": "user_account_a",
    "store_ID": "store_a",
    "permission": "DocumentMutate",
    "context_ID": "program_a"
}"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestFromSyncRecord> {
    vec![
        TestFromSyncRecord::new_pull_upsert(
            TABLE_NAME,
            USER_PERMISSION_1,
            UserPermissionRow {
                id: USER_PERMISSION_1.0.to_owned(),
                user_id: "user_account_a".to_string(),
                store_id: Some("store_a".to_string()),
                permission: Permission::DocumentQuery,
                context_id: Some(context_program_a().id.to_string()),
            },
        ),
        TestFromSyncRecord::new_pull_upsert(
            TABLE_NAME,
            USER_PERMISSION_2,
            UserPermissionRow {
                id: USER_PERMISSION_2.0.to_owned(),
                user_id: "user_account_a".to_string(),
                store_id: Some("store_a".to_string()),
                permission: Permission::DocumentMutate,
                context_id: Some(context_program_a().id.to_string()),
            },
        ),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestFromSyncRecord> {
    vec![TestFromSyncRecord::new_pull_delete(
        TABLE_NAME,
        USER_PERMISSION_2.0,
        UserPermissionRowDelete(USER_PERMISSION_2.0.to_string()),
    )]
}
