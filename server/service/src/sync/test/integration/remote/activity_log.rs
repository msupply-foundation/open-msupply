use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};
use chrono::NaiveDate;
use repository::{ActivityLogRow, ActivityLogRowDelete, ActivityLogType};
use util::uuid::uuid;

pub struct ActivityLogRecordTester;
impl SyncRecordTester for ActivityLogRecordTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        let store_id = &new_site_properties.store_id;

        // STEP 1 - insert
        let log_1 = ActivityLogRow {
            id: uuid(),
            r#type: ActivityLogType::InvoiceCreated,
            user_id: Some("user_account_a".to_string()),
            store_id: Some(store_id.to_string()),
            record_id: Some("outbound_shipment_a".to_string()),
            datetime: NaiveDate::from_ymd_opt(2020, 1, 1)
                .unwrap()
                .and_hms_opt(0, 0, 0)
                .unwrap(),
            changed_to: Some("from".to_string()),
            changed_from: Some("to".to_string()),
        };

        let mut log_2 = log_1.clone();
        log_2.id = uuid();
        log_2.r#type = ActivityLogType::InvoiceStatusAllocated;
        log_2.record_id = Some("inbound_shipment_a".to_string());
        log_2.changed_to = None;
        log_2.changed_from = None;

        let mut log_3 = log_1.clone();
        log_3.id = uuid();
        log_3.r#type = ActivityLogType::UserLoggedIn;
        log_3.store_id = None;
        log_3.record_id = None;

        result.push(TestStepData {
            integration_records: vec![
                IntegrationOperation::upsert(log_1),
                IntegrationOperation::upsert(log_2),
                // Should not sync out thus need to check if it's missing after re-initialisation
                IntegrationOperation::delete(ActivityLogRowDelete(log_3.id)),
            ],
            ..Default::default()
        });
        result
    }
}
