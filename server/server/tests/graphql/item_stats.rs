mod graphql {

    use crate::graphql::assert_graphql_query;
    use repository::mock::{mock_item_stats_item1, mock_item_stats_item2, MockDataInserts};
    use serde_json::json;
    use server::test_utils::setup_all;

    #[actix_rt::test]
    async fn test_graphql_item_stats_loader() {
        let (_, _, _, settings) =
            setup_all("test_graphql_item_stats_loader", MockDataInserts::all()).await;

        let query = r#"
        query($filter: ItemFilterInput) {
          items(filter: $filter) {
            ... on ItemConnector {
              nodes {
                id
                stats(storeId: \"store_a\") {
                    averageMonthlyConsumption
                    monthsOfStock
                    stockOnHand
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
                        "stockOnHand": 210,
                        "monthsOfStock": 210 as f64 / 15 as f64
                    }
                },
                {
                    "id": &mock_item_stats_item2().id,
                    "stats": {
                        "averageMonthlyConsumption": 5,
                        "stockOnHand": 22,
                        "monthsOfStock": 22 as f64 / 5 as f64
                    },
                }]
            }
        }
        );

        assert_graphql_query!(&settings, query, &Some(variables.clone()), &expected, None);
    }
}
