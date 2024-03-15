mod tests {
    use async_graphql::EmptyMutation;
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphql_test_with_data};
    use repository::mock::{test_item_stats, MockDataInserts};
    use serde_json::json;

    use crate::GeneralQueries;

    #[actix_rt::test]
    async fn test_graphql_item_stats_loader() {
        let (_, _, _, settings) = setup_graphql_test_with_data(
            GeneralQueries,
            EmptyMutation,
            "test_graphql_item_stats_loader",
            MockDataInserts::all(),
            test_item_stats::mock_item_stats(),
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
                "equalAny": [&test_item_stats::item().id, &test_item_stats::item2().id]
            },
          }
        }
        );

        let expected = json!({
            "items": {
                "nodes": [{
                    "id": &test_item_stats::item().id,
                    "stats": {
                        "averageMonthlyConsumption":  test_item_stats::item1_amc_3_months(),
                        "availableStockOnHand":  test_item_stats::item_1_soh(),
                        "availableMonthsOfStockOnHand": test_item_stats::item_1_soh() as f64 / test_item_stats::item1_amc_3_months()
                    }
                },
                {
                    "id": &test_item_stats::item2().id,
                    "stats": {
                        "averageMonthlyConsumption":  test_item_stats::item2_amc_3_months(),
                        "availableStockOnHand":  test_item_stats::item_2_soh(),
                        "availableMonthsOfStockOnHand": test_item_stats::item_2_soh() as f64 / test_item_stats::item2_amc_3_months()
                    },
                }]
            }
        }
        );

        assert_graphql_query!(&settings, query, &Some(variables.clone()), &expected, None);
    }
}
