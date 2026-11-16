mod graphql {
    use async_graphql::EmptyMutation;
    use base64::{Engine, prelude::BASE64_STANDARD};
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::{
        BackendPluginRow, PluginType, PluginTypes, PluginVariantType, migrations::Version,
        mock::MockDataInserts,
    };
    use serde_json::json;
    use service::backend_plugin::plugin_provider::PluginInstance;

    use crate::GeneralQueries;

    #[actix_rt::test]
    async fn test_graphql_items_query() {
        let (_, _, _, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "test_items_query",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"query items($itemFilter: ItemFilterInput!) {
            items(filter: $itemFilter, storeId: \"store_a\") {
                ... on ItemConnector {
                  nodes {
                      id
                      name
                      code
                      unitName
                      universalCode
                      availableBatches(storeId: \"store_a\") {
                         ... on StockLineConnector {
                            nodes {
                                id
                            }
                          }
                      }
                  }
               }
            }
        }"#;

        let variables = json!({
            "itemFilter": {
                "name": {
                    "like": "item_query_test"
                }
            }
        });

        let expected = json!({
              "items": {
                  "nodes": [
                      {
                          "id": "item_query_test1",
                          "name": "name_item_query_test1",
                          "code": "code_item_query_test1",
                          "unitName": null,
                          "universalCode": "",
                          "availableBatches": {
                              "nodes": [ { "id": "item_query_test1" } ]
                          }
                      },
                      {
                          "id": "item_query_test2",
                          "name": "name_item_query_test2",
                          "code": "code_item_query_test2",
                          "unitName": "name_item_query_test2",
                          "universalCode": "",
                           "availableBatches": {
                              "nodes": []
                          }
                      }
                  ]
              }
          }
        );
        assert_graphql_query!(&settings, query, &Some(variables), &expected, None);

        // Test filtering by universal code
        let variables = json!({
            "itemFilter": {
                "universalCode": {
                    "equalTo": "12345"
                }
            }
        });

        let expected = json!({
            "items": {
                "nodes": [
                    {
                        "id": "universal_code_item",
                        "name": "item with univeral code",
                        "code": "univeral_code_item",
                        "unitName": null,
                        "universalCode": "12345",
                        "availableBatches": {
                            "nodes": []
                        }
                    }
                ]
            }
        });

        assert_graphql_query!(&settings, query, &Some(variables), &expected, None);
    }

    // Adds a store_a row for item_query_test1, which has none, and leaves
    // item_query_test2 without one
    const TRANSFORM_ITEM_STORE_PROPERTIES_PLUGIN: &str = r#"
export const plugins = {
  transform_item_store_properties: ({ store_id, item_ids, rows }) => ({
    transformed_rows: [
      ...rows,
      ...item_ids
        .filter((item_id) => item_id === "item_query_test1")
        .map((item_id) => ({
          id: "plugin_row",
          item_id,
          store_id,
          default_sell_price_per_pack: 42,
          ignore_for_orders: false,
          margin: 0,
          default_location_id: null,
        })),
    ],
  }),
};
"#;

    #[actix_rt::test]
    async fn test_graphql_item_store_properties_transformed_by_plugin() {
        let (_, _, _, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "test_graphql_item_store_properties_transformed_by_plugin",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"query items($itemFilter: ItemFilterInput!) {
            items(filter: $itemFilter, storeId: \"store_a\") {
                ... on ItemConnector {
                  nodes {
                      id
                      itemStoreProperties(storeId: \"store_a\") {
                          defaultSellPricePerPack
                      }
                  }
               }
            }
        }"#;
        let variables = Some(json!({
            "itemFilter": { "name": { "like": "item_query_test" } }
        }));

        // Neither item has a row in store_a
        let expected = json!({
            "items": {
                "nodes": [
                    { "id": "item_query_test1", "itemStoreProperties": null },
                    { "id": "item_query_test2", "itemStoreProperties": null }
                ]
            }
        });
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        PluginInstance::bind(BackendPluginRow {
            id: "transform_item_store_properties".to_string(),
            code: "transform_item_store_properties".to_string(),
            version: Version::from_package_json().to_string(),
            bundle_base64: BASE64_STANDARD.encode(TRANSFORM_ITEM_STORE_PROPERTIES_PLUGIN),
            types: PluginTypes(vec![PluginType::TransformItemStoreProperties]),
            variant_type: PluginVariantType::BoaJs,
        });

        let expected = json!({
            "items": {
                "nodes": [
                    {
                        "id": "item_query_test1",
                        "itemStoreProperties": { "defaultSellPricePerPack": 42.0 }
                    },
                    { "id": "item_query_test2", "itemStoreProperties": null }
                ]
            }
        });
        assert_graphql_query!(&settings, query, &variables, &expected, None);
    }

    #[actix_rt::test]
    async fn test_graphql_item_store_properties_when_plugin_fails() {
        let (_, _, _, settings) = setup_graphql_test(
            GeneralQueries,
            EmptyMutation,
            "test_graphql_item_store_properties_when_plugin_fails",
            MockDataInserts::all(),
        )
        .await;

        PluginInstance::bind(BackendPluginRow {
            id: "transform_item_store_properties".to_string(),
            code: "transform_item_store_properties".to_string(),
            version: Version::from_package_json().to_string(),
            bundle_base64: BASE64_STANDARD.encode(
                r#"export const plugins = {
  transform_item_store_properties: () => { throw new Error("broken plugin"); },
};"#,
            ),
            types: PluginTypes(vec![PluginType::TransformItemStoreProperties]),
            variant_type: PluginVariantType::BoaJs,
        });

        // The query still answers, with the item store properties as stored:
        // item_query_test1 has a row in store_b, item_query_test2 none
        let query = r#"query items($itemFilter: ItemFilterInput!) {
            items(filter: $itemFilter, storeId: \"store_b\") {
                ... on ItemConnector {
                  nodes {
                      id
                      itemStoreProperties(storeId: \"store_b\") {
                          defaultSellPricePerPack
                      }
                  }
               }
            }
        }"#;
        let variables = Some(json!({
            "itemFilter": { "name": { "like": "item_query_test" } }
        }));
        let expected = json!({
            "items": {
                "nodes": [
                    {
                        "id": "item_query_test1",
                        "itemStoreProperties": { "defaultSellPricePerPack": 50.0 }
                    },
                    { "id": "item_query_test2", "itemStoreProperties": null }
                ]
            }
        });
        assert_graphql_query!(&settings, query, &variables, &expected, None);
    }
}
