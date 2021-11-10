#![allow(where_clauses_object_safety)]

mod graphql {
    use crate::graphql::assert_gql_query;
    use repository::{mock::MockDataInserts, repository::InvoiceRepository};
    use serde_json::json;
    use server::util::test_utils::setup_all;

    #[actix_rt::test]
    async fn test_graphql_outbound_shipment_insert() {
        let (mock_data, connection, settings) = setup_all(
            "omsupply-database-gql-outbound_shipment_insert",
            MockDataInserts::all(),
        )
        .await;

        let other_party_supplier = &mock_data.names[2];
        let other_party_customer = &mock_data.names[0];

        let query = r#"mutation InsertOutboundShipment($input: InsertOutboundShipmentInput!) {
            insertOutboundShipment(input: $input) {
                ... on InsertOutboundShipmentError {
                  error {
                    __typename
                  }
                }
                ... on NodeError {
                  error {
                    __typename
                  }
                }
                ... on InvoiceNode {
                    id
                    otherPartyId
                    type
                    comment
                    theirReference
                    onHold
                }
            }
        }"#;

        // OtherPartyNotACustomerError
        let variables = Some(json!({
          "input": {
            "id": "ci_insert_1",
            "otherPartyId": other_party_supplier.id,
          }
        }));
        let expected = json!({
            "insertOutboundShipment": {
              "error": {
                "__typename": "OtherPartyNotACustomerError"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // ForeignKeyError (OtherPartyIdNotFoundError)
        let foreign_key_query = r#"mutation InsertOutboundShipment($input: InsertOutboundShipmentInput!) {
          insertOutboundShipment(input: $input) {
              ... on InsertOutboundShipmentError {
                error {
                  ... on ForeignKeyError {
                    __typename
                    key
                  }
                }
              }
          }
        }"#;
        let variables = Some(json!({
          "input": {
            "id": "ci_insert_1",
            "otherPartyId": "not existing",
          }
        }));
        let expected = json!({
            "insertOutboundShipment": {
              "error": {
                "__typename": "ForeignKeyError",
                "key": "otherPartyId"
              }
            }
          }
        );
        assert_gql_query(&settings, foreign_key_query, &variables, &expected).await;

        // Test succeeding insert
        let variables = Some(json!({
          "input": {
            "id": "ci_insert_1",
            "otherPartyId": other_party_customer.id,
            "comment": "ci comment",
          }
        }));
        let expected = json!({
            "insertOutboundShipment": {
              "id": "ci_insert_1",
              "otherPartyId": other_party_customer.id,
              "type": "OUTBOUND_SHIPMENT",
              "comment": "ci comment",
              "theirReference": null,
              "onHold": false,
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;
        // make sure item has been inserted
        InvoiceRepository::new(&connection)
            .find_one_by_id("ci_insert_1")
            .unwrap();

        // Test succeeding insert on_hold and their_reference
        let variables = Some(json!({
          "input": {
            "id": "ci_insert_2",
            "otherPartyId": other_party_customer.id,
            "theirReference": "reference",
            "onHold": true,
          }
        }));
        let expected = json!({
            "insertOutboundShipment": {
              "id": "ci_insert_2",
              "otherPartyId": other_party_customer.id,
              "type": "OUTBOUND_SHIPMENT",
              "comment": null,
              "theirReference":"reference",
              "onHold": true,
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // RecordAlreadyExist,
        let variables = Some(json!({
          "input": {
            "id": "ci_insert_1",
            "otherPartyId": other_party_customer.id,
          }
        }));
        let expected = json!({
            "insertOutboundShipment": {
              "error": {
                "__typename": "RecordAlreadyExist"
              }
            }
          }
        );

        assert_gql_query(&settings, query, &variables, &expected).await;
    }
}
