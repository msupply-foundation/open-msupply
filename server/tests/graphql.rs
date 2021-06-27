#[cfg(test)]
mod graphql {
    use remote_server::database;
    use remote_server::server;
    use remote_server::util;

    #[actix_rt::test]
    async fn get_requisition_by_id_returns_200() {
        let configuration = util::configuration::get_configuration()
            .expect("Failed to parse configuration settings");

        let database = database::connection::DatabaseConnection::new(
            &configuration.database.connection_string(),
        )
        .await;

        // TODO: only insert required data.
        database
            .insert_mock_data()
            .await
            .expect("Failed to insert mock data");

        let mut app = actix_web::test::init_service(
            actix_web::App::new()
                .data(database.clone())
                .wrap(server::middleware::logger())
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
