use repository::ProgramIndicatorRow;

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "program_indicator";

const PROGRAM_INDICATOR_1: (&str, &str) = (
    "PROGRAM_INDICATOR_1",
    r#"{
        "ID": "PROGRAM_INDICATOR_1",
        "code": "Program Indicator 1",
        "program_ID": "87027C44835B48E6989376F42A58F7EA",
        "is_active": true
    }"#,
);

const PROGRAM_INDICATOR_2: (&str, &str) = (
    "PROGRAM_INDICATOR_2",
    r#"{
        "ID": "PROGRAM_INDICATOR_2",
        "code": "Program Indicator 2",
        "program_ID": "87027C44835B48E6989376F42A58F7EA",
        "is_active": true
    }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            PROGRAM_INDICATOR_1,
            ProgramIndicatorRow {
                id: PROGRAM_INDICATOR_1.0.to_owned(),
                code: "Program Indicator 1".to_owned(),
                program_id: "87027C44835B48E6989376F42A58F7EA".to_owned(),
                is_active: true,
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            PROGRAM_INDICATOR_2,
            ProgramIndicatorRow {
                id: PROGRAM_INDICATOR_2.0.to_owned(),
                code: "Program Indicator 2".to_owned(),
                program_id: "87027C44835B48E6989376F42A58F7EA".to_owned(),
                is_active: true,
            },
        ),
    ]
}
