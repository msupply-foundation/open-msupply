#![allow(where_clauses_object_safety)]

mod graphql {
    use remote_server::{
        database::{
            loader::get_loaders,
            mock::{
                mock_invoice_lines, mock_invoices, mock_items, mock_names, mock_stock_lines,
                mock_stores,
            },
            repository::{
                get_repositories, InvoiceLineRepository, InvoiceRepository, ItemRepository,
                NameRepository, StockLineRepository, StorageConnectionManager, StoreRepository,
            },
            schema::{InvoiceLineRow, InvoiceRow, ItemRow, NameRow, StockLineRow, StoreRow},
        },
        server::{
            data::{LoaderRegistry, RepositoryRegistry},
            service::graphql::config as graphql_config,
        },
        util::test_db,
    };

    use assert_json_diff::assert_json_eq;
    use serde_json::{json, Value};

    #[actix_rt::test]
    async fn test_graphql_invoices_query() {
        let settings = test_db::get_test_settings("omsupply-database-gql-invoices-query");
        test_db::setup(&settings.database).await;
        let repositories = get_repositories(&settings).await;
        let loaders = get_loaders(&settings).await;
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
        for stock_line in mock_stocks {
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

        let repository_registry = RepositoryRegistry { repositories };
        let loader_registry = LoaderRegistry { loaders };

        let repository_registry = actix_web::web::Data::new(repository_registry);
        let loader_registry = actix_web::web::Data::new(loader_registry);

        let mut app = actix_web::test::init_service(
            actix_web::App::new()
                .data(repository_registry.clone())
                .data(loader_registry.clone())
                .configure(graphql_config(repository_registry, loader_registry)),
        )
        .await;

        // Test query:
        let query = r#"{
            invoices{
                nodes{
                    id,
                    pricing{
                        totalAfterTax
                    }
                }
            }
        }"#
        .replace("\n", "");
        let payload = format!("{{\"query\":\"{}\"}}", query);
        let req = actix_web::test::TestRequest::post()
            .header("content-type", "application/json")
            .set_payload(payload)
            .uri("/graphql")
            .to_request();

        let res = actix_web::test::read_response(&mut app, req).await;
        let body = String::from_utf8(res.to_vec()).expect("Failed to parse response");

        let expected_json_invoice_nodes = mock_invoices
            .iter()
            .map(|invoice| {
                json!({
                    "id": invoice.id.to_owned(),
                    "pricing": {
                      "totalAfterTax": &mock_invoice_lines.iter().fold(0.0, |acc, invoice_line| {
                            if invoice_line.invoice_id == invoice.id {
                                acc + invoice_line.total_after_tax
                            } else {
                                acc
                            }
                        }),
                    }
                  }
                )
            })
            .collect::<serde_json::Value>();
        let expected = json!({
            "data": {
              "invoices": {
                "nodes": expected_json_invoice_nodes,
              }
            }
          }
        );
        assert_json_eq!(serde_json::from_str::<Value>(&body).unwrap(), expected);
    }
}
