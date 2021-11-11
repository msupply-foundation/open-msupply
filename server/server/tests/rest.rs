#[cfg(test)]
mod rest {
    use server::server;

    #[actix_rt::test]
    async fn health_check_returns_200() {
        let mut app = actix_web::test::init_service(
            actix_web::App::new().configure(server::service::rest::config),
        )
        .await;

        let req = actix_web::test::TestRequest::get()
            .uri("/health_check")
            .to_request();

        let res = actix_web::test::call_service(&mut app, req).await;

        assert!(res.status().is_success());
    }
}
