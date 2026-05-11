use repository::WarningRow;

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "warning";

const WARNING_1: (&str, &str) = (
    "WARNING_1",
    r#"{
      "warning_text": "1",
      "code": "WARNING_1_exp",
      "ID": "WARNING_1"
    }"#,
);

const WARNING_2: (&str, &str) = (
    "WARNING_2",
    r#"{
      "warning_text": "2",
      "code": "WARNING_2_exp",
      "ID": "WARNING_2"
    }"#,
);

const WARNING_3: (&str, &str) = (
    "WARNING_3",
    r#"{
      "warning_text": "3",
      "code": "WARNING_3_exp",
      "ID": "WARNING_3"
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            WARNING_1,
            WarningRow {
                id: WARNING_1.0.to_owned(),
                warning_text: "1".to_string(),
                code: "WARNING_1_exp".to_string(),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            WARNING_2,
            WarningRow {
                id: WARNING_2.0.to_owned(),
                warning_text: "2".to_string(),
                code: "WARNING_2_exp".to_string(),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            WARNING_3,
            WarningRow {
                id: WARNING_3.0.to_owned(),
                warning_text: "3".to_string(),
                code: "WARNING_3_exp".to_string(),
            },
        ),
    ]
}
