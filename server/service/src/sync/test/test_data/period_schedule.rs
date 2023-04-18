use repository::PeriodScheduleRow;

use crate::sync::{
    test::TestSyncPullRecord,
    translations::{LegacyTableName, PullUpsertRecord},
};

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

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::PERIOD_SCHEDULE,
            PERIOD_SCHEDULE_1,
            PullUpsertRecord::PeriodSchedule(PeriodScheduleRow {
                id: "period_schedule_1".to_string(),
                name: "Weekly1".to_string(),
            }),
        ),
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::PERIOD_SCHEDULE,
            PERIOD_SCHEDULE_2,
            PullUpsertRecord::PeriodSchedule(PeriodScheduleRow {
                id: "period_schedule_2".to_string(),
                name: "Yearly2".to_string(),
            }),
        ),
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::PERIOD_SCHEDULE,
            PERIOD_SCHEDULE_3,
            PullUpsertRecord::PeriodSchedule(PeriodScheduleRow {
                id: "597074CBCCC24166B8C1F82553DACC2F".to_string(),
                name: "Quarterly".to_string(),
            }),
        ),
    ]
}
