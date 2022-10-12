use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::{IntegrationRecords, PullDeleteRecord, PullDeleteRecordTable, PullUpsertRecord},
};
use chrono::NaiveDate;
use repository::{ActivityLogRow, ActivityLogType};
use serde_json::json;
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
            datetime: NaiveDate::from_ymd(2020, 1, 1).and_hms(0, 0, 0),
        };

        let log_2 = inline_edit(&log_1, |mut l| {
            l.id = uuid();
            l.r#type = ActivityLogType::InvoiceStatusAllocated;
            l.record_id = Some("inbound_shipment_a".to_string());
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
            central_upsert: json!({}),
            central_delete: json!({}),
            integration_records: IntegrationRecords::from_upserts(vec![
                PullUpsertRecord::ActivityLog(log_1.clone()),
                PullUpsertRecord::ActivityLog(log_2.clone()),
            ])
            .join(IntegrationRecords::from_deletes(vec![PullDeleteRecord {
                id: log_3.id.clone(),
                table: PullDeleteRecordTable::ActivityLog,
            }])),
        });
        result
    }
}
