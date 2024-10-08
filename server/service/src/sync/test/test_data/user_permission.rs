use repository::{
    mock::context_program_a, PermissionType, UserPermissionRow, UserPermissionRowDelete,
};

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "om_user_permission";

const USER_PERMISSION_1: (&str, &str) = (
    "user_permission_1",
    r#"{
    "ID": "user_permission_1",
    "user_ID": "user_account_a",
    "store_ID": "store_a",
    "permission": "DocumentQuery",
    "context_ID": "program_a"
}"#,
);

const USER_PERMISSION_2: (&str, &str) = (
    "user_permission_2",
    r#"{
    "ID": "user_permission_2",
    "user_ID": "user_account_a",
    "store_ID": "store_a",
    "permission": "DocumentMutate",
    "context_ID": "program_a"
}"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            USER_PERMISSION_1,
            UserPermissionRow {
                id: USER_PERMISSION_1.0.to_owned(),
                user_id: "user_account_a".to_string(),
                store_id: Some("store_a".to_string()),
                permission: PermissionType::DocumentQuery,
                context_id: Some(context_program_a().id.to_string()),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            USER_PERMISSION_2,
            UserPermissionRow {
                id: USER_PERMISSION_2.0.to_owned(),
                user_id: "user_account_a".to_string(),
                store_id: Some("store_a".to_string()),
                permission: PermissionType::DocumentMutate,
                context_id: Some(context_program_a().id.to_string()),
            },
        ),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        USER_PERMISSION_2.0,
        UserPermissionRowDelete(USER_PERMISSION_2.0.to_string()),
    )]
}
