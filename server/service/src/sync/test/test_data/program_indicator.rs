use repository::ProgramIndicatorRow;

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "program_indicator";

const PROGRAM_INDICATOR_A: (&str, &str) = (
    "program_indicator_a",
    r#"{
        "ID": "program_indicator_a",
        "code": "Program Indicator a",
        "program_ID": "program_a",
        "is_active": true
    }"#,
);

const PROGRAM_INDICATOR_B: (&str, &str) = (
    "program_indicator_b",
    r#"{
        "ID": "program_indicator_b",
        "code": "Program Indicator b",
        "program_ID": "program_a",
        "is_active": true
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            PROGRAM_INDICATOR_A,
            ProgramIndicatorRow {
                id: PROGRAM_INDICATOR_A.0.to_owned(),
                code: "Program Indicator a".to_owned(),
                program_id: "program_a".to_owned(),
                is_active: true,
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            PROGRAM_INDICATOR_B,
            ProgramIndicatorRow {
                id: PROGRAM_INDICATOR_B.0.to_owned(),
                code: "Program Indicator b".to_owned(),
                program_id: "program_a".to_owned(),
                is_active: true,
            },
        ),
    ]
}
