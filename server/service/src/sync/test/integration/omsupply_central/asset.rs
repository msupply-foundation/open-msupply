use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, SyncRecordTester, TestStepData,
    },
    translations::IntegrationOperation,
};

use repository::{asset_row::AssetRow, mock::mock_asset_a};

use util::uuid::uuid;

pub(crate) struct AssetTester;

impl SyncRecordTester for AssetTester {
    fn test_step_data(&self, site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();

        let asset_row = AssetRow {
            id: uuid(),
            store_id: Some(site_properties.store_id.clone()),
            ..mock_asset_a()
        };

        result.push(TestStepData {
            integration_records: vec![IntegrationOperation::upsert(asset_row.clone())],
            ..Default::default()
        });

        result
    }
}
