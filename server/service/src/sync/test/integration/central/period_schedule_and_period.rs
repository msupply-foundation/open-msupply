use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};
use repository::{PeriodRow, PeriodScheduleRow};

use chrono::NaiveDate;
use serde_json::json;
use util::uuid::uuid;

pub(crate) struct PeriodScheduleAndPeriodTester;

impl SyncRecordTester for PeriodScheduleAndPeriodTester {
    fn test_step_data(&self, _: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();

        // STEP 1 - insert
        let period_schedule_1 = PeriodScheduleRow {
            id: uuid(),
            name: "Monthly1".to_string(),
        };
        let period_schedule_1_json = json!({
            "ID": period_schedule_1.id,
            "name":  period_schedule_1.name,
        });

        let period_1 = PeriodRow {
            id: uuid(),
            period_schedule_id: period_schedule_1.id.clone(),
            name: "April 2023".to_string(),
            start_date: NaiveDate::from_ymd_opt(2023, 04, 01).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2023, 04, 30).unwrap(),
        };

        let period_1_json = json!({
            "ID": period_1.id,
            "periodScheduleID": period_schedule_1.id,
            "startDate": "2023-04-01",
            "endDate": "2023-04-30",
            "name":  period_1.name,
        });

        let period_schedule_2 = PeriodScheduleRow {
            id: uuid(),
            name: "Yearly1".to_string(),
        };

        let period_schedule_2_json = json!({
            "ID": period_schedule_2.id,
            "name":  period_schedule_2.name,
        });

        let period_2 = PeriodRow {
            id: uuid(),
            period_schedule_id: period_schedule_2.id.clone(),
            name: "2023".to_string(),
            start_date: NaiveDate::from_ymd_opt(2023, 01, 01).unwrap(),
            end_date: NaiveDate::from_ymd_opt(2023, 12, 31).unwrap(),
        };

        let period_2_json = json!({
            "ID": period_2.id,
            "periodScheduleID": period_schedule_2.id,
            "startDate": "2023-01-01",
            "endDate": "2023-12-31",
            "name":  period_2.name,
        });

        result.push(TestStepData {
            central_upsert: json!({
                "periodSchedule": [period_schedule_1_json, period_schedule_2_json],
                "period": [period_1_json, period_2_json]
            }),
            integration_records: vec![
                IntegrationOperation::upsert(period_schedule_1),
                IntegrationOperation::upsert(period_schedule_2),
                IntegrationOperation::upsert(period_1),
                IntegrationOperation::upsert(period_2),
            ],
            ..Default::default()
        });

        result
    }
}
