mod graphql {
    use crate::graphql::{assert_gql_not_found, assert_gql_query};
    use remote_server::{
        database::{
            mock::{
                mock_customer_invoices, mock_invoice_lines, mock_invoices, mock_items, mock_names,
                mock_stock_lines, mock_stores,
            },
            repository::{
                get_repositories, InvoiceLineRepository, InvoiceRepository, ItemRepository,
                NameRepository, StockLineRepository, StorageConnectionManager, StoreRepository,
            },
            schema::{InvoiceLineRow, InvoiceRow, ItemRow, NameRow, StockLineRow, StoreRow},
        },
        server::service::graphql::schema::types::InvoiceStatusInput,
        util::test_db,
    };

    use serde_json::json;

    #[actix_rt::test]
    async fn test_graphql_invoice_query() {
        let settings = test_db::get_test_settings("omsupply-database-gql-invoice-query");
        test_db::setup(&settings.database).await;
        let repositories = get_repositories(&settings).await;
        let connection_manager = repositories.get::<StorageConnectionManager>().unwrap();
        let connection = connection_manager.connection().unwrap();

        // setup
        let name_repository = NameRepository::new(&connection);
        let store_repository = StoreRepository::new(&connection);
        let item_repository = ItemRepository::new(&connection);
        let stock_repository = StockLineRepository::new(&connection);
        let invoice_repository = InvoiceRepository::new(&connection);
        let invoice_line_repository = InvoiceLineRepository::new(&connection);
        let mock_names: Vec<NameRow> = mock_names();
        let mock_stores: Vec<StoreRow> = mock_stores();
        let mock_items: Vec<ItemRow> = mock_items();
        let mock_stocks: Vec<StockLineRow> = mock_stock_lines();
        let mock_invoices: Vec<InvoiceRow> = mock_invoices();
        let mock_invoice_lines: Vec<InvoiceLineRow> = mock_invoice_lines();
        for name in mock_names {
            name_repository.insert_one(&name).await.unwrap();
        }
        for store in mock_stores {
            store_repository.insert_one(&store).await.unwrap();
        }
        for item in mock_items {
            item_repository.insert_one(&item).await.unwrap();
        }
        for stock_line in &mock_stocks {
            stock_repository.insert_one(&stock_line).await.unwrap();
        }
        for invoice in &mock_invoices {
            invoice_repository.insert_one(&invoice).await.unwrap();
        }
        for invoice_line in &mock_invoice_lines {
            invoice_line_repository
                .insert_one(&invoice_line)
                .await
                .unwrap();
        }

        let invoice = mock_customer_invoices()[0].clone();
        let query = format!(
            r#"{{            
                invoice(id:\"{}\"){{
                    id,
                    status,
                    lines{{
                        nodes{{
                            id,
                            stockLine{{
                                availableNumberOfPacks
                            }}
                        }}
                    }}
                }}            
            }}"#,
            invoice.id
        );

        let expected = json!({
            "invoice": {
                "id": invoice.id,
                "lines": {
                    "nodes": &mock_invoice_lines
                        .iter()
                        .filter(|invoice_line| invoice_line.invoice_id == invoice.id)
                        .map(|invoice_line| json!({
                            "id": invoice_line.id,
                            "stockLine": {
                                "availableNumberOfPacks": (&mock_stocks)
                                    .iter()
                                    .find(|stock_line|
                                        invoice_line.stock_line_id
                                        .as_ref()
                                        .map(|stock_line_id| &stock_line.id == stock_line_id)
                                        .unwrap_or(false))
                                    .unwrap()
                                    .available_number_of_packs
                                        + invoice_line.available_number_of_packs,
                            },
                        }))
                        .collect::<Vec<serde_json::Value>>(),
                },
                "status": InvoiceStatusInput::from(invoice.status),
            },
        });
        assert_gql_query(&settings, &query, &expected).await;

        // Test not found error
        assert_gql_not_found(
            &settings,
            r#"{            
                invoice(id:\"invalid\"){
                    id,
                    status,
                    lines{
                        nodes{
                            id,
                            stockLine{
                                availableNumberOfPacks
                            }
                        }
                    }
                }           
            }"#,
        )
        .await;
    }
}
