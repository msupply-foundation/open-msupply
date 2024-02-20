use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};
use repository::{LocationRow, LocationRowDelete};
use util::{inline_edit, uuid::uuid};

pub struct LocationRecordTester;
impl SyncRecordTester for LocationRecordTester {
    fn test_step_data(&self, new_site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();
        // STEP 1 - insert
        let store_id = &new_site_properties.store_id;
        let row = LocationRow {
            id: uuid(),
            name: "LoationName".to_string(),
            code: "LocationCode".to_string(),
            on_hold: false,
            store_id: store_id.to_string(),
        };

        result.push(TestStepData {
            integration_records: vec![IntegrationOperation::upsert(row.clone())],
            ..Default::default()
        });
        // STEP 2 - mutate
        let row = inline_edit(&row, |mut d| {
            d.name = "LoationName2".to_string();
            d.code = "LocationCode2".to_string();
            d.on_hold = true;
            d
        });
        result.push(TestStepData {
            integration_records: vec![IntegrationOperation::upsert(row.clone())],
            ..Default::default()
        });
        // STEP 3 - delete
        result.push(TestStepData {
            integration_records: vec![IntegrationOperation::delete(LocationRowDelete(row.id))],
            ..Default::default()
        });
        result
    }
}
