use repository::{Permission, UserPermissionRow};

use crate::sync::{
    test::TestSyncPullRecord,
    translations::{LegacyTableName, PullDeleteRecordTable, PullUpsertRecord},
};

const USER_PERMISSION_1: (&'static str, &'static str) = (
    "user_permission_1",
    r#"{
    "id": "user_permission_1",
    "user_id": "user_account_a",
    "store_id": "store_a",
    "permission": "DocumentQuery",
    "context": "RoutineImmunisationProgram"
}"#,
);

const USER_PERMISSION_2: (&'static str, &'static str) = (
    "user_permission_2",
    r#"{
    "id": "user_permission_2",
    "user_id": "user_account_a",
    "store_id": "store_a",
    "permission": "DocumentMutate",
    "context": "RoutineImmunisationProgram"
}"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::USER_PERMISSION,
            USER_PERMISSION_1,
            PullUpsertRecord::UserPermission(UserPermissionRow {
                id: USER_PERMISSION_1.0.to_owned(),
                user_id: "user_account_a".to_string(),
                store_id: Some("store_a".to_string()),
                permission: Permission::DocumentQuery,
                context: Some("RoutineImmunisationProgram".to_string()),
            }),
        ),
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::USER_PERMISSION,
            USER_PERMISSION_2,
            PullUpsertRecord::UserPermission(UserPermissionRow {
                id: USER_PERMISSION_2.0.to_owned(),
                user_id: "user_account_a".to_string(),
                store_id: Some("store_a".to_string()),
                permission: Permission::DocumentMutate,
                context: Some("RoutineImmunisationProgram".to_string()),
            }),
        ),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_delete(
        LegacyTableName::USER_PERMISSION,
        USER_PERMISSION_2.0,
        PullDeleteRecordTable::UserPermission,
    )]
}
