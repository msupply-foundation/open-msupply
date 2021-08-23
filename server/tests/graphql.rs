#![allow(where_clauses_object_safety)]

#[cfg(all(test, feature = "mock"))]
mod graphql {
    use remote_server::database::{
        mock::mock_requisitions,
        repository::RequisitionRepository,
        schema::{DatabaseRow, RequisitionRow},
    };

    use remote_server::server::{
        data::{RepositoryMap, RepositoryRegistry},
        service::graphql::config as graphql_config,
    };

    use std::collections::HashMap;
    use std::sync::{Arc, Mutex};

    #[actix_rt::test]
    async fn get_requisition_by_id_is_success() {
        let mut mock_data: HashMap<String, DatabaseRow> = HashMap::new();

        let mock_requisitions: Vec<RequisitionRow> = mock_requisitions();
        for requisition in mock_requisitions {
            mock_data.insert(
                requisition.id.to_string(),
                DatabaseRow::Requisition(requisition.clone()),
            );
        }

        let mut repositories: RepositoryMap = RepositoryMap::new();
        let mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>> = Arc::new(Mutex::new(mock_data));

        repositories.insert(RequisitionRepository::new(Arc::clone(&mock_data)));

        let registry = RepositoryRegistry {
            repositories,
            sync_sender: Arc::new(Mutex::new(tokio::sync::mpsc::channel(1).0)),
        };

        let registry = actix_web::web::Data::new(registry);
        let mut app = actix_web::test::init_service(
            actix_web::App::new()
                .data(registry.clone())
                .configure(graphql_config(registry)),
        )
        .await;

        // TODO: parameterise gql test payloads and expected results.
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
