use repository::{AbbreviationRow, AbbreviationRowDelete};

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "abbreviation";

const ABBREVIATION_1: (&str, &str) = (
    "ABBREVIATION_1",
    r#"{
      "abbreviation": "1",
      "expansion": "ABBREVIATION_1_exp",
      "ID": "ABBREVIATION_1"
    }"#,
);

const ABBREVIATION_2: (&str, &str) = (
    "ABBREVIATION_2",
    r#"{
      "abbreviation": "2",
      "expansion": "ABBREVIATION_2_exp",
      "ID": "ABBREVIATION_2"
    }"#,
);

const ABBREVIATION_3: (&str, &str) = (
    "ABBREVIATION_3",
    r#"{
      "abbreviation": "3",
      "expansion": "ABBREVIATION_3_exp",
      "ID": "ABBREVIATION_3"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            ABBREVIATION_1,
            AbbreviationRow {
                id: ABBREVIATION_1.0.to_owned(),
                text: "1".to_owned(),
                expansion: "ABBREVIATION_1_exp".to_owned(),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            ABBREVIATION_2,
            AbbreviationRow {
                id: ABBREVIATION_2.0.to_owned(),
                text: "2".to_owned(),
                expansion: "ABBREVIATION_2_exp".to_owned(),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            ABBREVIATION_3,
            AbbreviationRow {
                id: ABBREVIATION_3.0.to_owned(),
                text: "3".to_owned(),
                expansion: "ABBREVIATION_3_exp".to_owned(),
            },
        ),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncIncomingRecord> {
    vec![TestSyncIncomingRecord::new_pull_delete(
        TABLE_NAME,
        ABBREVIATION_1.0,
        AbbreviationRowDelete(ABBREVIATION_1.0.to_string()),
    )]
}
