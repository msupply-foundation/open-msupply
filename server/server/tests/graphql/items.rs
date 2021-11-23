mod graphql {
    use crate::graphql::assert_gql_query;
    use repository::mock::MockDataInserts;
    use serde_json::json;
    use server::test_utils::setup_all;

    #[actix_rt::test]
    async fn test_graphql_items_query() {
        let (_, _, settings) = setup_all("test_items_query", MockDataInserts::all()).await;

        let query = r#"query items($itemFilter: ItemFilterInput!) {
            items(filter: $itemFilter) {
                ... on ItemConnector {
                  nodes {
                      id
                      name
                      code
                      isVisible
                      unitName
                      availableBatches {
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
                          "isVisible": true,
                          "unitName": null,
                          "availableBatches": {
                              "nodes": [ { "id": "item_query_test1" } ]
                          }
                      },
                      {
                          "id": "item_query_test2",
                          "name": "name_item_query_test2",
                          "code": "code_item_query_test2",
                          "isVisible": false,
                          "unitName": "name_item_query_test2",
                           "availableBatches": {
                              "nodes": []
                          }
                      }
                  ]
              }
          }
        );
        assert_gql_query(&settings, query, &Some(variables), &expected, None).await;
    }
}
