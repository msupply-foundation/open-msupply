mod graphql {
    use crate::graphql::assert_graphql_query;
    use repository::{
        mock::{mock_stock_line_a, mock_stock_line_b, mock_store_a, MockDataInserts},
        StocktakeLineRowRepository,
    };
    use serde_json::json;
    use server::test_utils::setup_all;

    #[actix_rt::test]
    async fn test_graphql_stocktake_batch() {
        let (_, connection, _, settings) = setup_all(
            "omsupply-database-gql-stocktake_batch",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation BatchStocktake($storeId: String, $input: BatchStocktakeInput!) {
          batchStocktake(storeId: $storeId, input: $input) {
            __typename
            ... on BatchStocktakeResponses {                    
              insertStocktakes {
                id
                response {
                  ... on StocktakeNode {
                    id
                  }
                }
              }
              insertStocktakeLines {
                id
                response {
                  ... on StocktakeLineNode {
                    id
                  }
                }
              }
              updateStocktakeLines {
                id
                response {
                  ... on StocktakeLineNode {
                    id
                  }
                }
              }
              updateStocktakes {
                id
                response {
                  ... on StocktakeNode {
                    id
                  }
                }
              }
            }
            ... on BatchStocktakeResponsesWithErrors {               
              updateStocktakeLines {
                id
                response {
                  ... on StocktakeLineNode {
                    id
                  }
                }
              }
              updateStocktakes {
                id
                response {
                  __typename
                  ... on StocktakeNode {
                    id
                  }
                  ... on UpdateStocktakeError {
                    __typename
                  }
                }        
              }
            }
          }
        }"#;

        // success
        let store = mock_store_a();
        let stock_line_a = mock_stock_line_a();
        let stock_line_b = mock_stock_line_b();

        let variables = Some(json!({
            "storeId": store.id,
            "input": {
              "insertStocktakes": [
                {
                  "id": "batch_stocktake_1",
                  "createdDatetime": "2022-02-09T15:16:00",
                },
              ],
              "insertStocktakeLines": [
                {
                  "id": "batch_stocktake_line_1",
                  "stocktakeId": "batch_stocktake_1",
                  "stockLineId": stock_line_a.id,
                },
                {
                  "id": "batch_stocktake_line_2",
                  "stocktakeId": "batch_stocktake_1",
                  "stockLineId": stock_line_b.id,
                }
              ],
            }
        }));
        let expected = json!({
          "batchStocktake": {
              "__typename": "BatchStocktakeResponses",
              "insertStocktakes": [
                {
                  "id": "batch_stocktake_1",
                }
              ],
              "insertStocktakeLines": [
                {
                  "id": "batch_stocktake_line_1",
                  "response": {
                    "id": "batch_stocktake_line_1",
                  }
                },
                {
                  "id": "batch_stocktake_line_2",
                  "response": {
                    "id": "batch_stocktake_line_2",
                  }
                }
              ],
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // structured error / abort transaction
        // update snapshotNumberOfPacks for a stocktake line and then try to finalise the stocktake
        let variables = Some(json!({
            "storeId": store.id,
            "input": {
              "updateStocktakeLines": [
                {
                  "id": "batch_stocktake_line_1",
                  "snapshotNumberOfPacks": stock_line_a.total_number_of_packs + 1,
                },
              ],
              "updateStocktakes": [
                {
                  "id": "batch_stocktake_1",
                  "status": "FINALISED"
                }
              ]
            }
        }));
        let expected = json!({
          "batchStocktake": {
              "__typename": "BatchStocktakeResponsesWithErrors",
              "updateStocktakeLines": [
                {
                  "id": "batch_stocktake_line_1",
                  "response": {
                    "id": "batch_stocktake_line_1",
                  }
                },
              ],
              "updateStocktakes": [
                {
                  "id": "batch_stocktake_1",
                  "response": {
                    "__typename": "UpdateStocktakeError",
                  },
                }
              ]
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);
        // check that tx has been aborted and stocktake line hasn't been updated
        let stocktake_line = StocktakeLineRowRepository::new(&connection)
            .find_one_by_id("batch_stocktake_line_1")
            .unwrap()
            .unwrap();
        assert_eq!(
            stocktake_line.snapshot_number_of_packs,
            stock_line_a.total_number_of_packs
        );
    }
}
