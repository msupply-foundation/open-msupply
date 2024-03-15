mod graphql {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test};
    use repository::mock::MockDataInserts;
    use serde_json::json;

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
                          "availableBatches": {
                              "nodes": [ { "id": "item_query_test1" } ]
                          }
                      },
                      {
                          "id": "item_query_test2",
                          "name": "name_item_query_test2",
                          "code": "code_item_query_test2",
                          "unitName": "name_item_query_test2",
                           "availableBatches": {
                              "nodes": []
                          }
                      }
                  ]
              }
          }
        );
        assert_graphql_query!(&settings, query, &Some(variables), &expected, None);
    }
}
