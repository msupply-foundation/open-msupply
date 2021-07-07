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
        let mut requisition_mock_data: HashMap<String, database::schema::RequisitionRow> =
            HashMap::new();

        requisition_mock_data.extend(mocks::get_request_requisition_a_to_b());

        let requisition_repository_mock_data: Arc<
            Mutex<HashMap<String, database::schema::RequisitionRow>>,
        > = Arc::new(Mutex::new(requisition_mock_data));

        let requisition_repository: Arc<database::repository::RequisitionMockRepository> = Arc::new(
            database::repository::RequisitionMockRepository::new(requisition_repository_mock_data),
        );

        let registry = server::data::RepositoryRegistry {
            customer_invoice_repository: None,
            item_repository: None,
            item_line_repository: None,
            name_repository: None,
            requisition_repository: Some(requisition_repository),
            requisition_line_repository: None,
            store_repository: None,
            transact_repository: None,
            transact_line_repository: None,
            user_account_repository: None,
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
