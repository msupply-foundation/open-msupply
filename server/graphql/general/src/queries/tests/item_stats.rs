mod tests {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::mock::{mock_item_stats_item1, mock_item_stats_item2, MockDataInserts};
    use serde_json::json;

    use crate::GeneralQueries;

    #[actix_rt::test]
    async fn test_graphql_item_stats_loader() {
        let (_, _, _, settings) = setup_graphl_test(
            GeneralQueries,
            EmptyMutation,
            "test_graphql_item_stats_loader",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"
        query($filter: ItemFilterInput) {
          items(filter: $filter, storeId: \"store_a\") {
            ... on ItemConnector {
              nodes {
                id
                stats(storeId: \"store_a\") {
                    averageMonthlyConsumption
                    availableMonthsOfStockOnHand
                    availableStockOnHand
                }
              }
            }
          }
       }
        "#;

        let variables = json!({
          "filter": {
            "id": {
                "equalAny": [&mock_item_stats_item1().id, &mock_item_stats_item2().id]
            },
          }
        }
        );

        // As per item stats repository test
        let expected = json!({
            "items": {
                "nodes": [{
                    "id": &mock_item_stats_item1().id,
                    "stats": {
                        "averageMonthlyConsumption":  15,
                        "availableStockOnHand": 210,
                        "availableMonthsOfStockOnHand": 210 as f64 / 15 as f64
                    }
                },
                {
                    "id": &mock_item_stats_item2().id,
                    "stats": {
                        "averageMonthlyConsumption": 5,
                        "availableStockOnHand": 22,
                        "availableMonthsOfStockOnHand": 22 as f64 / 5 as f64
                    },
                }]
            }
        }
        );

        assert_graphql_query!(&settings, query, &Some(variables.clone()), &expected, None);
    }
}
