mod graphql {
    use crate::graphql::{assert_gql_not_found, assert_gql_query};
    use domain::invoice::InvoiceStatus;
    use remote_server::util::test_utils::setup_all;

    use graphql::schema::types::InvoiceNodeStatus;
    use repository::mock::MockDataInserts;
    use serde_json::json;

    #[actix_rt::test]
    async fn test_graphql_invoice_query() {
        let (mock_data, _, settings) = setup_all(
            "omsupply-database-gql-invoice-query",
            MockDataInserts::all(),
        )
        .await;

        let full_invoice = mock_data.full_invoices.get("draft_ci_a").unwrap();

        let query = r#"query Invoice($id: String) {            
                invoice(id: $id) {
                    ... on InvoiceNode {
                        id
                        status
                        otherParty {
                            ... on NameNode {
                                id
                            }
                        }
                        lines {
                            ... on InvoiceLineConnector {
                                nodes {
                                    id
                                    stockLine {
                                        ... on StockLineNode {
                                            availableNumberOfPacks
                                        }
                                    }
                                }
                            }
                        }
                    }
                }         
            }"#;

        let variables = Some(json!({
          "id": full_invoice.invoice.id
        }));

        let expected = json!({
            "invoice": {
                "id": full_invoice.invoice.id,
                "otherParty": {
                    "id": full_invoice.invoice.name_id
                },
                "lines": {
                    "nodes": full_invoice.lines
                        .iter()
                        .map(|line_and_stock| json!({
                            "id": line_and_stock.line.id,
                            "stockLine": {
                                "availableNumberOfPacks": line_and_stock.stock_line.available_number_of_packs
                            }
                        })).collect::<Vec<serde_json::Value>>(),
                },
                "status": InvoiceNodeStatus::from(InvoiceStatus::from(full_invoice.invoice.status.clone())),
            },
        });
        assert_gql_query(&settings, &query, &variables, &expected).await;

        // Test not found error
        assert_gql_not_found(
            &settings,
            r#"query InvoiceNotFound($id: String) {
                invoice(id: $id){
                    ... on NodeError {
                        error {
                            __typename
                            description
                        }
                    }
                }           
            }"#,
            &Some(json!({
                "id": "invalid"
            })),
        )
        .await;
    }
}
