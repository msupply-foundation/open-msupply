mod graphql {
    use crate::graphql::assert_graphql_query;
    use repository::{
        mock::{mock_stock_line_a, mock_stock_line_b, mock_store_a, MockDataInserts},
        StockTakeLineRowRepository,
    };
    use serde_json::json;
    use server::test_utils::setup_all;

    #[actix_rt::test]
    async fn test_graphql_stock_take_batch() {
        let (_, connection, _, settings) = setup_all(
            "omsupply-database-gql-stock_take_batch",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation BatchStocktake($storeId: String, $input: BatchStocktakeInput!) {
          batchStocktake(storeId: $storeId, input: $input) {
            __typename
            ... on BatchStocktakeResponses {                    
              insertStocktake {
                ... on StockTakeNode {
                  id
                }
              }
              insertStocktakeLines {
                id
                response {
                  ... on StockTakeLineNode {
                    id
                  }
                }
              }
              updateStocktakeLines {
                id
                response {
                  ... on StockTakeLineNode {
                    id
                  }
                }
              }
              updateStocktake {
                ... on StockTakeNode {
                  id
                }
              }
            }
            ... on BatchStocktakeResponsesWithErrors {               
              updateStocktakeLines {
                id
                response {
                  ... on StockTakeLineNode {
                    id
                  }
                }
              }
              updateStocktake {
                __typename
                ... on StockTakeNode {
                  id
                }
                ... on UpdateStockTakeError {
                  __typename
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
              "insertStocktake": {
                "id": "batch_stocktake_1",
                "createdDatetime": "2022-02-09T15:16:00",
              },
              "insertStocktakeLines": [
                {
                  "id": "batch_stocktake_line_1",
                  "stockTakeId": "batch_stocktake_1",
                  "stockLineId": stock_line_a.id,
                },
                {
                  "id": "batch_stocktake_line_2",
                  "stockTakeId": "batch_stocktake_1",
                  "stockLineId": stock_line_b.id,
                }
              ],
            }
        }));
        let expected = json!({
          "batchStocktake": {
              "__typename": "BatchStocktakeResponses",
              "insertStocktake": {
                "id": "batch_stocktake_1",
              },
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
              "updateStocktake": {
                "id": "batch_stocktake_1",
                "status": "FINALISED"
              }
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
              "updateStocktake": {
                "__typename": "UpdateStockTakeError",
              },
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);
        // check that tx has been aborted and stocktake line hasn't been updated
        let stocktake_line = StockTakeLineRowRepository::new(&connection)
            .find_one_by_id("batch_stocktake_line_1")
            .unwrap()
            .unwrap();
        assert_eq!(
            stocktake_line.snapshot_number_of_packs,
            stock_line_a.total_number_of_packs
        );
    }
}
