use crate::sync::test::TestSyncPullRecord;

use repository::{NameTagJoinRow, NameTagJoinRowDelete};

const TABLE_NAME: &'static str = "name_tag_join";

const NAME_TAG_JOIN_1: (&'static str, &'static str) = (
    "44F59B35C8FE3C41B779CFF6AC823F57",
    r#"{
        "ID": "44F59B35C8FE3C41B779CFF6AC823F57",
        "name_ID": "name_store_a",
        "name_tag_ID": "59F2635D22B346ADA0088D6261926465"
    }"#,
);

fn name_tag_join_1() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        NAME_TAG_JOIN_1,
        NameTagJoinRow {
            id: NAME_TAG_JOIN_1.0.to_owned(),
            name_link_id: "name_store_a".to_owned(),
            name_tag_id: "59F2635D22B346ADA0088D6261926465".to_owned(),
        },
    )
}

const NAME_TAG_JOIN_2: (&'static str, &'static str) = (
    "1D70E1B015B2694B8998B2BE1C018B66",
    r#"{ 
        "ID": "1D70E1B015B2694B8998B2BE1C018B66",
        "name_ID": "name_store_a",
        "name_tag_ID": "1A3B380E37F741729DAC4761AF3549F9"
}"#,
);

fn name_tag_join_2() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        NAME_TAG_JOIN_2,
        NameTagJoinRow {
            id: NAME_TAG_JOIN_2.0.to_owned(),
            name_link_id: "name_store_a".to_owned(),
            name_tag_id: "1A3B380E37F741729DAC4761AF3549F9".to_owned(),
        },
    )
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![name_tag_join_1(), name_tag_join_2()]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_delete(
        TABLE_NAME,
        NAME_TAG_JOIN_2.0,
        NameTagJoinRowDelete(NAME_TAG_JOIN_2.0.to_string()),
    )]
}
