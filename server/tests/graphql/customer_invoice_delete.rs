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
                NameRepository, RepositoryError, StockLineRepository, StorageConnectionManager,
                StoreRepository,
            },
        },
        util::test_db,
    };
    use serde_json::json;

    #[actix_rt::test]
    async fn test_graphql_customer_invoice_insert() {
        let settings = test_db::get_test_settings("omsupply-database-gql-customer_invoice_delete");
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
            invoice_line_repository.upsert_one(invoice_line).unwrap();
        }

        let query = r#"mutation DeleteCustomerInvoice($id: String!) {
            deleteCustomerInvoice(id: $id) {
                ... on DeleteCustomerInvoiceError {
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
            "deleteCustomerInvoice": {
              "error": {
                "__typename": "RecordDoesNotExist"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // CannotEditFinalisedInvoice
        let variables = Some(json!({
          "id": "customer_invoice_finalised"
        }));
        let expected = json!({
            "deleteCustomerInvoice": {
              "error": {
                "__typename": "CannotEditFinalisedInvoice"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // NotACustomerInvoice
        let variables = Some(json!({
          "id": "empty_draft_supplier_invoice"
        }));
        let expected = json!({
            "deleteCustomerInvoice": {
              "error": {
                "__typename": "NotACustomerInvoice"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // CannotDeleteInvoiceWithLines
        let variables = Some(json!({
          "id": "customer_invoice_a"
        }));
        let expected = json!({
            "deleteCustomerInvoice": {
              "error": {
                "__typename": "CannotDeleteInvoiceWithLines"
              }
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;

        // Test succeeding delete
        let variables = Some(json!({
          "id": "customer_invoice_no_lines"
        }));
        let expected = json!({
            "deleteCustomerInvoice": {
              "id": "customer_invoice_no_lines"
            }
          }
        );
        assert_gql_query(&settings, query, &variables, &expected).await;
        // test entry has been deleted
        assert_eq!(
            invoice_repository
                .find_one_by_id("customer_invoice_no_lines")
                .expect_err("Invoice not deleted"),
            RepositoryError::NotFound
        );
    }
}
