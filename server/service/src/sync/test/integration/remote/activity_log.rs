use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};
use chrono::NaiveDate;
use repository::{ActivityLogRow, ActivityLogRowDelete, ActivityLogType};
use util::{inline_edit, uuid::uuid};

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

        let log_2 = inline_edit(&log_1, |mut l| {
            l.id = uuid();
            l.r#type = ActivityLogType::InvoiceStatusAllocated;
            l.record_id = Some("inbound_shipment_a".to_string());
            l.changed_to = None;
            l.changed_from = None;
            l
        });

        let log_3 = inline_edit(&log_1, |mut l| {
            l.id = uuid();
            l.r#type = ActivityLogType::UserLoggedIn;
            l.store_id = None;
            l.record_id = None;
            l
        });

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
