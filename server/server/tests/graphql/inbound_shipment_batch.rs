mod graphql {
    use crate::graphql::assert_graphql_query;
    use repository::{
        mock::{mock_stock_line_a, mock_stock_line_b, mock_store_a, MockDataInserts},
        InboundShipmentLineRowRepository,
    };
    use serde_json::json;
    use server::test_utils::setup_all;

    #[actix_rt::test]
    async fn test_graphql_inboundshipment_batch() {
        let (_, connection, _, settings) = setup_all(
            "omsupply-database-gql-inboundshipment_batch",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation BatchInboundShipment($storeId: String, $input: BatchInboundShipmentInput!) {
          batchInboundShipment(input: $input, storeId: \"store_a\") {
            __typename
            ... on BatchInboundShipmentResponses {                    
              insertInboundShipments {
                id
                response {
                  ... on InvoiceNod {
                    id
                  }
                }
              }
          }
        }"#;

        // success

        let variables = Some(json!({
            "input": {
              "insertInboundShipments": [
                {
                  "id": "batch_inboundshipment_1",
                  "createdDatetime": "2022-02-09T15:16:00",
                },
              ],
              "insertInboundShipmentLines": [
                {
                  "id": "batch_inboundshipment_line_1",
                  "inboundshipmentId": "batch_inboundshipment_1",
                  "stockLineId": stock_line_a.id,
                },
                {
                  "id": "batch_inboundshipment_line_2",
                  "inboundshipmentId": "batch_inboundshipment_1",
                  "stockLineId": stock_line_b.id,
                }
              ],
            }
        }));
        let expected = json!({
          "batchInboundShipment": {
              "__typename": "BatchInboundShipmentResponses",
              "insertInboundShipments": [
                {
                  "id": "batch_inboundshipment_1",
                }
              ],
              "insertInboundShipmentLines": [
                {
                  "id": "batch_inboundshipment_line_1",
                  "response": {
                    "id": "batch_inboundshipment_line_1",
                  }
                },
                {
                  "id": "batch_inboundshipment_line_2",
                  "response": {
                    "id": "batch_inboundshipment_line_2",
                  }
                }
              ],
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);
    }
}
