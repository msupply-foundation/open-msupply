use crate::sync::{
    test::TestSyncPullRecord,
    translations::{LegacyTableName, PullUpsertRecord},
};
use repository::AuthoriserRow;

const AUTHORISER_1: (&'static str, &'static str) = (
    "authoriser",
    r#"{
    "ID": "authoriser_one",
    "is_active": true,
    "list_master_ID": "master_list_one",
    "userID": "user_account_a",
}"#,
);
const AUTHORISER_2: (&'static str, &'static str) = (
    "authoriser",
    r#"{
    "ID": "authoriser_two",
    "is_active": true,
    "list_master_ID": "master_list_one",
    "userID": "user_account_b",
}"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::AUTHORISER,
            AUTHORISER_1,
            PullUpsertRecord::Authoriser(AuthoriserRow {
                id: "authoriser_one".to_string(),
                is_active: true,
                master_list_id: "master_list_one".to_string(),
                user_id: "user_account_a".to_string(),
            }),
        ),
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::AUTHORISER,
            AUTHORISER_2,
            PullUpsertRecord::Authoriser(AuthoriserRow {
                id: "authoriser_two".to_string(),
                is_active: true,
                master_list_id: "master_list_one".to_string(),
                user_id: "user_account_b".to_string(),
            }),
        ),
    ]
}
