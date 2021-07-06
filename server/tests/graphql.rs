mod mocks;

use remote_server::database;
use remote_server::server;

#[cfg(test)]
mod graphql {
    use super::database;
    use super::mocks;
    use super::server;

    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};

    #[actix_rt::test]
    async fn get_requisition_by_id_is_success() {
        let transact_repository_mock_data: Arc<
            Mutex<HashMap<String, database::schema::TransactRow>>,
        > = Arc::new(Mutex::new(HashMap::new()));

        let customer_invoice_repository_mock_data: Arc<
            Mutex<HashMap<String, database::schema::TransactRow>>,
        > = Arc::clone(&transact_repository_mock_data);

        let transact_line_repository_mock_data: Arc<
            Mutex<HashMap<String, database::schema::TransactLineRow>>,
        > = Arc::new(Mutex::new(HashMap::new()));

        let item_repository_mock_data: Arc<Mutex<HashMap<String, database::schema::ItemRow>>> =
            Arc::new(Mutex::new(HashMap::new()));

        let item_line_repository_mock_data: Arc<
            Mutex<HashMap<String, database::schema::ItemLineRow>>,
        > = Arc::new(Mutex::new(HashMap::new()));

        let name_repository_mock_data: Arc<Mutex<HashMap<String, database::schema::NameRow>>> =
            Arc::new(Mutex::new(HashMap::new()));

        let mut requisition_mock_data: HashMap<String, database::schema::RequisitionRow> =
            HashMap::new();

        requisition_mock_data.insert(String::from("requisition_a"), mocks::get_request_requisition_a_to_b());

        let requisition_repository_mock_data: Arc<
            Mutex<HashMap<String, database::schema::RequisitionRow>>,
        > = Arc::new(Mutex::new(requisition_mock_data));

        let requisition_line_repository_mock_data: Arc<
            Mutex<HashMap<String, database::schema::RequisitionLineRow>>,
        > = Arc::new(Mutex::new(HashMap::new()));

        let store_repository_mock_data: Arc<Mutex<HashMap<String, database::schema::StoreRow>>> =
            Arc::new(Mutex::new(HashMap::new()));

        let user_account_repository_mock_data: Arc<
            Mutex<HashMap<String, database::schema::UserAccountRow>>,
        > = Arc::new(Mutex::new(HashMap::new()));

        let customer_invoice_repository =
            Arc::new(database::repository::CustomerInvoiceMockRepository::new(
                customer_invoice_repository_mock_data,
            ));

        let item_repository = Arc::new(database::repository::ItemMockRepository::new(
            item_repository_mock_data,
        ));

        let item_line_repository = Arc::new(database::repository::ItemLineMockRepository::new(
            item_line_repository_mock_data,
        ));

        let name_repository = Arc::new(database::repository::NameMockRepository::new(
            name_repository_mock_data,
        ));

        let requisition_repository = Arc::new(
            database::repository::RequisitionMockRepository::new(requisition_repository_mock_data),
        );

        let requisition_line_repository =
            Arc::new(database::repository::RequisitionLineMockRepository::new(
                requisition_line_repository_mock_data,
            ));

        let store_repository = Arc::new(database::repository::StoreMockRepository::new(
            store_repository_mock_data,
        ));

        let transact_repository = Arc::new(database::repository::TransactMockRepository::new(
            transact_repository_mock_data,
        ));

        let transact_line_repository =
            Arc::new(database::repository::TransactLineMockRepository::new(
                transact_line_repository_mock_data,
            ));

        let user_account_repository = Arc::new(
            database::repository::UserAccountMockRepository::new(user_account_repository_mock_data),
        );

        let registry = server::data::RepositoryRegistry {
            customer_invoice_repository,
            item_repository,
            item_line_repository,
            name_repository,
            requisition_repository,
            requisition_line_repository,
            store_repository,
            transact_repository,
            transact_line_repository,
            user_account_repository,
        };

        let mut app = actix_web::test::init_service(
            actix_web::App::new()
                .data(registry.clone())
                .configure(server::service::graphql::config),
        )
        .await;

        let payload = r#"{"query":"{requisition(id:\"requisition_a\"){id}}"}"#.as_bytes();

        let req = actix_web::test::TestRequest::post()
            .header("content-type", "application/json")
            .set_payload(payload)
            .uri("/graphql")
            .to_request();

        let res = actix_web::test::read_response(&mut app, req).await;
        let body = String::from_utf8(res.to_vec()).expect("Failed to parse response");

        assert_eq!(body, r#"{"data":{"requisition":{"id":"requisition_a"}}}"#);
    }
}
