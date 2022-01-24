#![allow(where_clauses_object_safety)]

mod graphql {
    use crate::graphql::assert_graphql_query;
    use repository::{
        mock::{
            mock_name_linked_to_store, mock_name_not_linked_to_store,
            mock_outbound_shipment_number_store_a, mock_store_linked_to_name, MockDataInserts,
        },
        InvoiceRepository,
    };
    use serde_json::json;
    use server::test_utils::setup_all;
    use util::uuid::uuid;

    #[actix_rt::test]
    async fn test_graphql_outbound_shipment_insert() {
        let (mock_data, connection, _, settings) = setup_all(
            "omsupply-database-gql-outbound_shipment_insert",
            MockDataInserts::all(),
        )
        .await;

        let other_party_supplier = &mock_data["base"].names[2];
        let other_party_customer = &mock_data["base"].names[0];

        let starting_invoice_number = mock_outbound_shipment_number_store_a().value;

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
                    otherPartyStore {
                      id
                    }
                    invoiceNumber
                    type
                    comment
                    theirReference
                    onHold
                    color
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
        assert_graphql_query!(&settings, query, &variables, &expected, None);

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
        assert_graphql_query!(&settings, foreign_key_query, &variables, &expected, None);

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
              "invoiceNumber": starting_invoice_number+1,
              "otherPartyId": other_party_customer.id,
              "type": "OUTBOUND_SHIPMENT",
              "comment": "ci comment",
              "theirReference": null,
              "onHold": false,
              "color": null,
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);
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
            "color": "#FFFFFF"
          }
        }));
        let expected = json!({
            "insertOutboundShipment": {
              "id": "ci_insert_2",
              "invoiceNumber": starting_invoice_number+2,
              "otherPartyId": other_party_customer.id,
              "type": "OUTBOUND_SHIPMENT",
              "comment": null,
              "theirReference":"reference",
              "onHold": true,
              "color": "#FFFFFF"
            }
          }
        );
        assert_graphql_query!(&settings, query, &variables, &expected, None);

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

        assert_graphql_query!(&settings, query, &variables, &expected, None);

        // Test Success name_store_id, linked to store
        let id = uuid();
        let variables = Some(json!({
          "input": {
            "id": id,
            "otherPartyId": mock_name_linked_to_store().id,
          }
        }));
        let expected = json!({
            "insertOutboundShipment": {
              "id": id,
              "otherPartyStore": {
                "id": mock_store_linked_to_name().id
              }
            }
          }
        );

        assert_graphql_query!(&settings, query, &variables, &expected, None);

        let new_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&id)
            .unwrap();

        assert_eq!(
            new_invoice.name_store_id,
            Some(mock_store_linked_to_name().id)
        );

        // Test Success name_store_id, not linked to store
        let id = uuid();
        let variables = Some(json!({
          "input": {
            "id": id,
            "otherPartyId": mock_name_not_linked_to_store().id,
          }
        }));
        let expected = json!({
            "insertOutboundShipment": {
              "id": id,
              "otherPartyStore": null
            }
          }
        );

        assert_graphql_query!(&settings, query, &variables, &expected, None);

        let new_invoice = InvoiceRepository::new(&connection)
            .find_one_by_id(&id)
            .unwrap();

        assert_eq!(new_invoice.name_store_id, None);
    }
}
