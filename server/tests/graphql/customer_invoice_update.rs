#![allow(where_clauses_object_safety)]

mod graphql {
    use crate::graphql::assert_gql_query;
    use remote_server::{
        database::{
            mock::{
                mock_invoice_lines, mock_invoices, mock_items, mock_names, mock_stock_lines,
                mock_stores,
            },
            repository::{
                get_repositories, InvoiceLineRepository, InvoiceRepository, ItemRepository,
                NameRepository, StockLineRepository, StorageConnectionManager, StoreRepository,
            },
            schema::{InvoiceLineRow, StockLineRow},
        },
        util::test_db,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_graphql_customer_invoice_update() {
        let settings = test_db::get_test_settings("omsupply-database-gql-customer_invoice_update");
        test_db::setup(&settings.database).await;
        let repositories = get_repositories(&settings).await;
        let connection_manager = repositories.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        // setup
        let name_repository = NameRepository::new(&connection);
        let store_repository = StoreRepository::new(&connection);
        let item_repository = ItemRepository::new(&connection);
        let stock_line_repository = StockLineRepository::new(&connection);
        let invoice_repository = InvoiceRepository::new(&connection);
        let invoice_line_repository = InvoiceLineRepository::new(&connection);
        let mock_names = mock_names();
        let mock_stores = mock_stores();
        let mock_items = mock_items();
        let mock_stock_lines = mock_stock_lines();
        let mock_invoices = mock_invoices();
        let mock_invoice_lines = mock_invoice_lines();
        for name in &mock_names {
            name_repository.insert_one(&name).await.unwrap();
        }
        for store in mock_stores {
            store_repository.insert_one(&store).await.unwrap();
        }
        for item in &mock_items {
            item_repository.upsert_one(item).unwrap();
        }
        for stock_line in &mock_stock_lines {
            stock_line_repository.upsert_one(stock_line).unwrap();
        }
        for invoice in &mock_invoices {
            invoice_repository.upsert_one(invoice).unwrap();
        }
        for invoice_line in &mock_invoice_lines {
            invoice_line_repository
                .insert_one(invoice_line)
                .await
                .unwrap();
        }

        let query = r#"mutation DeleteCustomerInvoice($input: UpdateCustomerInvoiceInput!) {
            updateCustomerInvoice(input: $input) {
                ... on UpdateCustomerInvoiceError {
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
            "id": "customer_invoice_confirmed",
            "status": "DRAFT"
          }
        }));
        let expected = json!({
            "updateCustomerInvoice": {
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
            "id": "customer_invoice_finalised",
            "status": "DRAFT"
          }
        }));
        let expected = json!({
            "updateCustomerInvoice": {
              "error": {
                "__typename": "FinalisedInvoiceIsNotEditableError"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // InvoiceNotFoundError
        let variables = Some(json!({
          "input": {
            "id": "does not exist",
          }
        }));
        let expected = json!({
            "updateCustomerInvoice": {
              "error": {
                "__typename": "InvoiceNotFoundError"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // ForeignKeyError (Other party does not exist)
        let variables = Some(json!({
          "input": {
            "id": "customer_invoice_a",
            "otherPartyId": "invalid_other_party"
          }
        }));
        let expected = json!({
            "updateCustomerInvoice": {
              "error": {
                "__typename": "ForeignKeyError"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // OtherPartyNotACustomerError
        let other_party_supplier = &mock_names[2];
        let variables = Some(json!({
          "input": {
            "id": "customer_invoice_a",
            "otherPartyId": other_party_supplier.id
          }
        }));
        let expected = json!({
            "updateCustomerInvoice": {
              "error": {
                "__typename": "OtherPartyNotACustomerError"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // NotACustomerInvoiceError
        let variables = Some(json!({
          "input": {
            "id": "supplier_invoice_a",
          }
        }));
        let expected = json!({
            "updateCustomerInvoice": {
              "error": {
                "__typename": "NotACustomerInvoiceError"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // InvoiceLineHasNoStockLineError
        let variables = Some(json!({
          "input": {
            "id": "customer_invoice_invalid_stock_line",
            "status": "FINALISED"
          }
        }));
        let expected = json!({
            "updateCustomerInvoice": {
              "error": {
                "__typename": "InvoiceLineHasNoStockLineError"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // helpers to compare totals
        // fetches all invoice lines and all matching stock lines
        let invoice_lines_and_stock_lines = |invoice_id: &str| {
            let combined_lines: Vec<(StockLineRow, InvoiceLineRow)> = invoice_line_repository
                .find_many_by_invoice_id(invoice_id)
                .unwrap()
                .into_iter()
                .map(|line| {
                    let stock_line_id = line.stock_line_id.as_ref().unwrap();
                    (
                        stock_line_repository
                            .find_one_by_id(&stock_line_id)
                            .unwrap(),
                        line,
                    )
                })
                .collect();
            combined_lines
        };
        // asserts that current stock line totals are updated correctly
        let assert_stock_lines_updated = |pairs: &Vec<(StockLineRow, InvoiceLineRow)>| {
            for (old_stock_line, line) in pairs {
                let new_stock_line = stock_line_repository
                    .find_one_by_id(&old_stock_line.id)
                    .unwrap();
                assert_eq!(
                    new_stock_line.total_number_of_packs,
                    old_stock_line.total_number_of_packs - line.number_of_packs,
                    "error matching total_number_of_packs {:#?}",
                    (&new_stock_line, old_stock_line, line)
                );
            }
        };

        // test DRAFT to CONFIRMED
        let prev_lines = invoice_lines_and_stock_lines("customer_invoice_a");
        let variables = Some(json!({
          "input": {
            "id": "customer_invoice_a",
            "status": "CONFIRMED",
            "comment": "test_comment"
          }
        }));
        let expected = json!({
            "updateCustomerInvoice": {
              "id": "customer_invoice_a",
              "comment": "test_comment"
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;
        assert_stock_lines_updated(&prev_lines);

        // test DRAFT to FINALISED
        let prev_lines = invoice_lines_and_stock_lines("customer_invoice_b");
        let variables = Some(json!({
          "input": {
            "id": "customer_invoice_b",
            "status": "FINALISED",
            "comment": "test_comment_b"
          }
        }));
        let expected = json!({
            "updateCustomerInvoice": {
              "id": "customer_invoice_b",
              "comment": "test_comment_b"
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;
        assert_stock_lines_updated(&prev_lines);
    }
}
