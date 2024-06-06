use crate::sync::{
    test::integration::{
        central_server_configurations::NewSiteProperties, GraphqlRequest, SyncRecordTester,
        TestStepData,
    },
    translations::IntegrationOperation,
};

use repository::PackVariantRow;
use serde_json::json;
use util::uuid::uuid;

pub(crate) struct PackVariantTester;

impl SyncRecordTester for PackVariantTester {
    fn test_step_data(&self, site_properties: &NewSiteProperties) -> Vec<TestStepData> {
        let mut result = Vec::new();

        let item_id = uuid();
        // STEP 1 - insert
        let item_json = json!({
            "ID": item_id.clone(),
            "type_of": "general",

        });

        let pack_variant = PackVariantRow {
            id: uuid(),
            item_id: item_id.clone(),
            short_name: uuid(),
            long_name: uuid(),
            pack_size: 20.0,
            is_active: true,
        };

        let pack_variant_mutation = GraphqlRequest {
            query: r#"
            mutation insert($storeId: String!, $input: InsertPackVariantInput!) {
                centralServer {
                    packVariant {
                        insertPackVariant(storeId: $storeId, input: $input) {
                            ... on VariantNode {
                            id
                            }
                    }
                    }
                }
            }"#
            .to_string(),
            variables: json!({
                "input": {
                    "id": pack_variant.id,
                    "itemId": pack_variant.item_id,
                    "longName": pack_variant.long_name,
                    "packSize": pack_variant.pack_size,
                    "shortName": pack_variant.short_name,
                },
                "storeId": site_properties.store_id
            }),
        };

        result.push(TestStepData {
            central_upsert: json!({
                "item": [item_json],
            }),
            integration_records: vec![IntegrationOperation::upsert(pack_variant.clone())],
            om_supply_central_graphql_operations: vec![pack_variant_mutation],
            ..Default::default()
        });

        // STEP 2 - upsert
        let pack_variant = PackVariantRow {
            long_name: uuid(),
            short_name: uuid(),
            ..pack_variant
        };

        let pack_variant_mutation = GraphqlRequest {
            query: r#"
            mutation update($storeId: String!, $input: UpdatePackVariantInput!) {
                centralServer {
                    packVariant {
                        updatePackVariant(storeId: $storeId, input: $input) {
                            ... on VariantNode {
                            id
                            }
                        }
                    }
                }
            }"#
            .to_string(),
            variables: json!({
                "input": {
                    "id": pack_variant.id,
                    "longName": pack_variant.long_name,
                     "shortName": pack_variant.short_name,
                },
                "storeId": site_properties.store_id
            }),
        };

        result.push(TestStepData {
            integration_records: vec![IntegrationOperation::upsert(pack_variant.clone())],
            om_supply_central_graphql_operations: vec![pack_variant_mutation],
            ..Default::default()
        });

        result
    }
}
