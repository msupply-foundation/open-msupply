#![allow(where_clauses_object_safety)]

mod graphql {
    use crate::graphql::assert_gql_query;
    use domain::stock_line::StockLine;
    use repository::{
        mock::MockDataInserts, schema::InvoiceLineRow, InvoiceLineRepository, StockLineRepository,
    };
    use serde_json::json;
    use server::test_utils::setup_all;

    #[actix_rt::test]
    async fn test_graphql_outbound_shipment_update() {
        let (mock_data, connection, settings) = setup_all(
            "omsupply-database-gql-outbound_shipment_update",
            MockDataInserts::all(),
        )
        .await;

        let query = r#"mutation DeleteOutboundShipment($input: UpdateOutboundShipmentInput!) {
            updateOutboundShipment(input: $input) {
                ... on UpdateOutboundShipmentError {
                  error {
                    __typename
                  }
                }
                ... on InvoiceNode {
                  id
                  comment
                }
            }
        }"#;

        // CannotChangeStatusBackToDraftError
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_confirmed",
            "status": "DRAFT"
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "error": {
                "__typename": "CannotChangeStatusBackToDraftError"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // FinalisedInvoiceIsNotEditableError
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_finalised",
            "status": "DRAFT"
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "error": {
                "__typename": "FinalisedInvoiceIsNotEditableError"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // RecordNotFound
        let variables = Some(json!({
          "input": {
            "id": "does not exist",
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "error": {
                "__typename": "RecordNotFound"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // ForeignKeyError (Other party does not exist)
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_a",
            "otherPartyId": "invalid_other_party"
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "error": {
                "__typename": "ForeignKeyError"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // OtherPartyNotACustomerError
        let other_party_supplier = &mock_data.names[2];
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_a",
            "otherPartyId": other_party_supplier.id
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "error": {
                "__typename": "OtherPartyNotACustomerError"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // NotAnOutboundShipmentError
        let variables = Some(json!({
          "input": {
            "id": "inbound_shipment_a",
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "error": {
                "__typename": "NotAnOutboundShipmentError"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // InvoiceLineHasNoStockLineError
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_invalid_stock_line",
            "status": "FINALISED"
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "error": {
                "__typename": "InvoiceLineHasNoStockLineError"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // helpers to compare totals
        let stock_lines_for_invoice_lines = |invoice_lines: &Vec<InvoiceLineRow>| {
            let stock_line_ids: Vec<String> = invoice_lines
                .iter()
                .filter_map(|invoice| invoice.stock_line_id.to_owned())
                .collect();
            StockLineRepository::new(&connection)
                .find_many_by_ids(&stock_line_ids)
                .unwrap()
        };
        // calculates the expected stock line total for every invoice line row
        let expected_stock_line_totals = |invoice_lines: &Vec<InvoiceLineRow>| {
            let stock_lines = stock_lines_for_invoice_lines(invoice_lines);
            let expected_stock_line_totals: Vec<(StockLine, i32)> = stock_lines
                .into_iter()
                .map(|line| {
                    let invoice_line = invoice_lines
                        .iter()
                        .find(|il| il.stock_line_id.clone().unwrap() == line.id)
                        .unwrap();
                    let expected_total = line.total_number_of_packs - invoice_line.number_of_packs;
                    (line, expected_total)
                })
                .collect();
            expected_stock_line_totals
        };
        let assert_stock_line_totals =
            |invoice_lines: &Vec<InvoiceLineRow>, expected: &Vec<(StockLine, i32)>| {
                let stock_lines = stock_lines_for_invoice_lines(invoice_lines);
                for line in stock_lines {
                    let expected = expected.iter().find(|l| l.0.id == line.id).unwrap();
                    assert_eq!(line.total_number_of_packs, expected.1);
                }
            };

        // test DRAFT to CONFIRMED
        let invoice_lines = InvoiceLineRepository::new(&connection)
            .find_many_by_invoice_id("outbound_shipment_c")
            .unwrap();
        let expected_totals = expected_stock_line_totals(&invoice_lines);
        let variables = Some(json!({
          "input": {
            "id": "outbound_shipment_c",
            "status": "CONFIRMED",
            "comment": "test_comment"
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "id": "outbound_shipment_c",
              "comment": "test_comment"
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;
        assert_stock_line_totals(&invoice_lines, &expected_totals);

        // test DRAFT to FINALISED (while setting onHold to true)
        let full_invoice = mock_data.full_invoices.get("draft_ci_a").unwrap();
        let invoice_id = full_invoice.invoice.id.clone();
        let invoice_lines = full_invoice.get_lines();
        let expected_totals = expected_stock_line_totals(&invoice_lines);
        let variables = Some(json!({
          "input": {
            "id": invoice_id,
            "status": "FINALISED",
            "comment": "test_comment_b",
            "onHold": true,
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "id": invoice_id,
              "comment": "test_comment_b"
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;
        assert_stock_line_totals(&invoice_lines, &expected_totals);

        // test Status Change on Hold
        let full_invoice = mock_data
            .full_invoices
            .get("outbound_shipment_on_hold")
            .unwrap();
        let invoice_id = full_invoice.invoice.id.clone();

        let variables = Some(json!({
          "input": {
            "id": invoice_id,
            "status": "FINALISED",
            "comment": "test_comment_b"
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "error": {
                "__typename": "CannotChangeStatusOfInvoiceOnHold"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // test Status Change and on hold change
        let full_invoice = mock_data
            .full_invoices
            .get("outbound_shipment_on_hold")
            .unwrap();
        let invoice_id = full_invoice.invoice.id.clone();

        let variables = Some(json!({
          "input": {
            "id": invoice_id,
            "status": "FINALISED",
            "onHold": false,
          }
        }));
        let expected = json!({
            "updateOutboundShipment": {
              "id": invoice_id,
              "comment": null
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;
    }
}
