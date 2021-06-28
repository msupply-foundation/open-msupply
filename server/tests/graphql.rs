mod mocks;

use remote_server::server;

#[cfg(test)]
mod graphql {
    use super::mocks;
    use super::server;

    #[actix_rt::test]
    async fn get_requisition_by_id_is_success() {
        let database = mocks::get_test_database().await;

        database
            .create_name(&mocks::get_name_store_a())
            .await
            .expect("Failed to insert name_store_a");

        database
            .create_name(&mocks::get_name_store_b())
            .await
            .expect("Failed to insert name_store_b");

        database
            .create_store(&mocks::get_store_a())
            .await
            .expect("Failed to insert store_a");

        database
            .create_store(&mocks::get_store_b())
            .await
            .expect("Failed to insert store_b");

        database
            .create_requisition(&mocks::get_request_requisition_a_to_b())
            .await
            .expect("Failed to insert request_requisition_a_to_b");

        let mut app = actix_web::test::init_service(
            actix_web::App::new()
                .data(database.clone())
                .configure(server::services::graphql::config),
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
