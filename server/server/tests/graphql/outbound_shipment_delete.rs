#![allow(where_clauses_object_safety)]

mod graphql {
    use crate::graphql::assert_gql_query;
    use server::util::test_utils::setup_all;
    use repository::{
        mock::MockDataInserts,
        repository::{InvoiceRepository, RepositoryError},
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_graphql_outbound_shipment_delete() {
        let (_, connection, settings) = setup_all(
            "omsupply-database-gql-outbound_shipment_delete",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation DeleteOutboundShipment($id: String!) {
            deleteOutboundShipment(id: $id) {
                ... on DeleteOutboundShipmentError {
                  error {
                    __typename
                  }
                }
                ... on DeleteResponse {
                    id
                }
            }
        }"#;

        // OtherPartyNotACustomerError
        let variables = Some(json!({
          "id": "does not exist"
        }));
        let expected = json!({
            "deleteOutboundShipment": {
              "error": {
                "__typename": "RecordNotFound"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // CannotEditFinalisedInvoice
        let variables = Some(json!({
          "id": "outbound_shipment_finalised"
        }));
        let expected = json!({
            "deleteOutboundShipment": {
              "error": {
                "__typename": "CannotEditFinalisedInvoice"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // NotAnOutboundShipment
        let variables = Some(json!({
          "id": "empty_draft_inbound_shipment"
        }));
        let expected = json!({
            "deleteOutboundShipment": {
              "error": {
                "__typename": "NotAnOutboundShipment"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // CannotDeleteInvoiceWithLines
        let variables = Some(json!({
          "id": "outbound_shipment_a"
        }));
        let expected = json!({
            "deleteOutboundShipment": {
              "error": {
                "__typename": "CannotDeleteInvoiceWithLines"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // Test succeeding delete
        let variables = Some(json!({
          "id": "outbound_shipment_no_lines"
        }));
        let expected = json!({
            "deleteOutboundShipment": {
              "id": "outbound_shipment_no_lines"
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;
        // test entry has been deleted
        assert_eq!(
            InvoiceRepository::new(&connection)
                .find_one_by_id("outbound_shipment_no_lines")
                .expect_err("Invoice not deleted"),
            RepositoryError::NotFound
        );
    }
}
