use chrono::NaiveDate;
use repository::PeriodRow;

use crate::sync::{
    test::TestSyncPullRecord,
    translations::{LegacyTableName, PullDeleteRecordTable, PullUpsertRecord},
};

const PERIOD_1: (&'static str, &'static str) = (
    "period_1",
    r#"{
    "ID": "period_1",
    "periodScheduleID": "period_schedule_1",
    "startDate": "2023-01-01",
    "endDate": "2023-01-07",
    "name": "Jan Wk01 2023"
  }"#,
);

const PERIOD_2: (&'static str, &'static str) = (
    "period_2",
    r#"{
    "ID": "period_2",
    "periodScheduleID": "period_schedule_2",
    "startDate": "2023-02-01",
    "endDate": "2023-03-01",
    "name": "Feb 2023"
  }"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncPullRecord> {
    vec![
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::PERIOD,
            PERIOD_1,
            PullUpsertRecord::Period(PeriodRow {
                id: "period_1".to_string(),
                period_schedule_id: "period_schedule_1".to_string(),
                name: "Jan Wk01 2023".to_string(),
                start_date: NaiveDate::from_ymd_opt(2023, 01, 01).unwrap(),
                end_date: NaiveDate::from_ymd_opt(2023, 01, 07).unwrap(),
            }),
        ),
        TestSyncPullRecord::new_pull_upsert(
            LegacyTableName::PERIOD,
            PERIOD_2,
            PullUpsertRecord::Period(PeriodRow {
                id: "period_2".to_string(),
                period_schedule_id: "period_schedule_2".to_string(),
                name: "Feb 2023".to_string(),
                start_date: NaiveDate::from_ymd_opt(2023, 02, 01).unwrap(),
                end_date: NaiveDate::from_ymd_opt(2023, 03, 01).unwrap(),
            }),
        ),
    ]
}

pub(crate) fn test_pull_delete_records() -> Vec<TestSyncPullRecord> {
    vec![TestSyncPullRecord::new_pull_delete(
        LegacyTableName::PERIOD,
        PERIOD_1.0,
        PullDeleteRecordTable::Period,
    )]
}
