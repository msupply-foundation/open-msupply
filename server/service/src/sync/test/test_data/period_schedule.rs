use repository::PeriodScheduleRow;

use crate::sync::test::TestFromSyncRecord;

const TABLE_NAME: &'static str = "periodSchedule";

const PERIOD_SCHEDULE_1: (&'static str, &'static str) = (
    "period_schedule_1",
    r#"{
    "ID": "period_schedule_1",
    "name": "Weekly1"
  }"#,
);

const PERIOD_SCHEDULE_2: (&'static str, &'static str) = (
    "period_schedule_2",
    r#"{
    "ID": "period_schedule_2",
    "name": "Yearly2"
  }"#,
);

const PERIOD_SCHEDULE_3: (&'static str, &'static str) = (
    "597074CBCCC24166B8C1F82553DACC2F",
    r#"{
  "ID": "597074CBCCC24166B8C1F82553DACC2F",
  "name": "Quarterly"
}"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestFromSyncRecord> {
    vec![
        TestFromSyncRecord::new_pull_upsert(
            TABLE_NAME,
            PERIOD_SCHEDULE_1,
            PeriodScheduleRow {
                id: "period_schedule_1".to_string(),
                name: "Weekly1".to_string(),
            },
        ),
        TestFromSyncRecord::new_pull_upsert(
            TABLE_NAME,
            PERIOD_SCHEDULE_2,
            PeriodScheduleRow {
                id: "period_schedule_2".to_string(),
                name: "Yearly2".to_string(),
            },
        ),
        TestFromSyncRecord::new_pull_upsert(
            TABLE_NAME,
            PERIOD_SCHEDULE_3,
            PeriodScheduleRow {
                id: "597074CBCCC24166B8C1F82553DACC2F".to_string(),
                name: "Quarterly".to_string(),
            },
        ),
    ]
}
