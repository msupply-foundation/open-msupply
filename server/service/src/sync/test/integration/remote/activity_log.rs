use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullUpsertRecord},
};
use repository::ActivityLogRow;
use serde_json::json;
use util::{inline_edit, uuid::uuid};

pub struct ActivityLogRecordTester;
impl SyncRecordTester for ActivityLogRecordTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        let store_id = &new_site_properties.store_id;

        // STEP 1 - insert
        let store_id = &new_site_properties.store_id;
        let row = ActivityLogRow {
            id: uuid(),
            r#type: ActivityLogType::UserLoggedIn,
            user_id: Some("user_account_a".to_string()),
            store_id: None,
            record_id: None,
            datetime: NaiveDate::from_ymd(2020, 1, 1).and_hms(0, 0, 0),
        };

        result.push(TestStepData {
            central_upsert: json!({}),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::ActivityLog(row.clone()),
            ]),
        });
        result
    }
}
