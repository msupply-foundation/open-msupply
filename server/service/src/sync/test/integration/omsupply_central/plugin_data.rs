use crate::sync::{
    test::{
        integration::{
            central_server_configurations::NewSiteProperties, GraphqlRequest, SyncRecordTester,
            TestStepData,
        },
        test_data::plugin_data::plugin_data,
    },
    translations::IntegrationOperation,
};

use repository::PluginDataRow;

use serde_json::json;
use util::uuid::uuid;

pub(crate) struct PluginDataCentral;

impl SyncRecordTester for PluginDataCentral {
    fn test_step_data(&self, site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();

        let plugin_row = PluginDataRow {
            id: uuid(),
            store_id: None,
            ..plugin_data()
        };

        result.push(TestStepData {
            integration_records: vec![IntegrationOperation::upsert(plugin_row.clone())],
            om_supply_central_graphql_operations: vec![GraphqlRequest {
                query: r#"  
                mutation MyMutation($input: InsertPluginDataInput!, $storeId: String!) {
                    insertPluginData(input: $input, storeId: $storeId) {
                        ... on PluginDataNode {
                            id
                        }
                    }
                }
            "#
                .to_string(),
                variables: json!({"storeId": site_properties.store_id.clone(), "input": {
                    "id": plugin_row.id,
                    "pluginCode": plugin_row.plugin_code,
                    "relatedRecordId": plugin_row.related_record_id,
                    "dataIdentifier": plugin_row.data_identifier,
                    "data": plugin_row.data
                }}),
            }],
            ..Default::default()
        });

        result
    }
}

pub(crate) struct PluginDataRemote;

impl SyncRecordTester for PluginDataRemote {
    fn test_step_data(&self, site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();

        let plugin_row = PluginDataRow {
            id: uuid(),
            store_id: Some(site_properties.store_id.clone()),
            ..plugin_data()
        };

        result.push(TestStepData {
            integration_records: vec![IntegrationOperation::upsert(plugin_row.clone())],
            ..Default::default()
        });

        result
    }
}
