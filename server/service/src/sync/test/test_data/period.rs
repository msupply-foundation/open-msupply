use chrono::NaiveDate;
use repository::PeriodRow;

use crate::sync::test::TestSyncIncomingRecord;

const TABLE_NAME: &str = "period";

const PERIOD_1: (&str, &str) = (
    "period_1",
    r#"{
    "ID": "period_1",
    "periodScheduleID": "period_schedule_1",
    "startDate": "2023-01-01",
    "endDate": "2023-01-07",
    "name": "Jan Wk01 2023"
  }"#,
);

const PERIOD_2: (&str, &str) = (
    "period_2",
    r#"{
    "ID": "period_2",
    "periodScheduleID": "period_schedule_2",
    "startDate": "2023-01-01",
    "endDate": "2023-12-31",
    "name": "2023"
  }"#,
);

const PERIOD_3: (&str, &str) = (
    "641A3560C84A44BC9E6DDC01F3D75923",
    r#"{
  "ID": "641A3560C84A44BC9E6DDC01F3D75923",
  "endDate": "2020-06-30",
  "name": "2020_Q2",
  "periodScheduleID": "597074CBCCC24166B8C1F82553DACC2F",
  "startDate": "2020-04-01"
}
"#,
);
const PERIOD_4: (&str, &str) = (
    "772B3984DBA14A5F941ED0EF857FDB31",
    r#"{
  "ID": "772B3984DBA14A5F941ED0EF857FDB31",
  "endDate": "2020-09-30",
  "name": "2020_Q3",
  "periodScheduleID": "597074CBCCC24166B8C1F82553DACC2F",
  "startDate": "2020-07-01"
}

"#,
);

pub(crate) fn test_pull_upsert_records() -> Vec<TestSyncIncomingRecord> {
    vec![
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            PERIOD_1,
            PeriodRow {
                id: "period_1".to_string(),
                period_schedule_id: "period_schedule_1".to_string(),
                name: "Jan Wk01 2023".to_string(),
                start_date: NaiveDate::from_ymd_opt(2023, 1, 1).unwrap(),
                end_date: NaiveDate::from_ymd_opt(2023, 1, 7).unwrap(),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            PERIOD_2,
            PeriodRow {
                id: "period_2".to_string(),
                period_schedule_id: "period_schedule_2".to_string(),
                name: "2023".to_string(),
                start_date: NaiveDate::from_ymd_opt(2023, 1, 1).unwrap(),
                end_date: NaiveDate::from_ymd_opt(2023, 12, 31).unwrap(),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            PERIOD_3,
            PeriodRow {
                id: "641A3560C84A44BC9E6DDC01F3D75923".to_string(),
                period_schedule_id: "597074CBCCC24166B8C1F82553DACC2F".to_string(),
                name: "2020_Q2".to_string(),
                start_date: NaiveDate::from_ymd_opt(2020, 4, 1).unwrap(),
                end_date: NaiveDate::from_ymd_opt(2020, 6, 30).unwrap(),
            },
        ),
        TestSyncIncomingRecord::new_pull_upsert(
            TABLE_NAME,
            PERIOD_4,
            PeriodRow {
                id: "772B3984DBA14A5F941ED0EF857FDB31".to_string(),
                period_schedule_id: "597074CBCCC24166B8C1F82553DACC2F".to_string(),
                name: "2020_Q3".to_string(),
                start_date: NaiveDate::from_ymd_opt(2020, 7, 1).unwrap(),
                end_date: NaiveDate::from_ymd_opt(2020, 9, 30).unwrap(),
            },
        ),
    ]
}
