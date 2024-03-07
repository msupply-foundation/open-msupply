use crate::sync::test::TestSyncPullRecord;

use repository::NameTagRow;

const TABLE_NAME: &'static str = "name_tag";

const NAME_TAG_1: (&'static str, &'static str) = (
    "59F2635D22B346ADA0088D6261926465",
    r#"{
                "ID": "59F2635D22B346ADA0088D6261926465",
                "description": "a1"
    }"#,
);

fn name_tag_1() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        NAME_TAG_1,
        NameTagRow {
            id: NAME_TAG_1.0.to_owned(),
            name: "a1".to_owned(),
        },
    )
}

const NAME_TAG_2: (&'static str, &'static str) = (
    "1A3B380E37F741729DAC4761AF3549F9",
    r#"{ 
        "ID": "1A3B380E37F741729DAC4761AF3549F9",
        "description": "b2"
}"#,
);

fn name_tag_2() -> TestSyncPullRecord {
    TestSyncPullRecord::new_pull_upsert(
        TABLE_NAME,
        NAME_TAG_2,
        NameTagRow {
            id: NAME_TAG_2.0.to_owned(),
            name: "b2".to_owned(),
        },
    )
}

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![name_tag_1(), name_tag_2()]
}
