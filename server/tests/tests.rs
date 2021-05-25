//! tests/health_check.rs

use rust_server::run;

use std::net::TcpListener;

fn spawn_app() -> String {
    let listener = TcpListener::bind("127.0.0.1:0").expect("Failed to bind random port");
    let port = listener.local_addr().unwrap().port();
    let server = run(listener).expect("Failed to bind address");

    let _ = tokio::spawn(server);

    format!("http://127.0.0.1:{}", port)
}

#[actix_rt::test]
async fn health_check_works() {
    let address = spawn_app();
    let client = reqwest::Client::new();

    let response = client
        .get(&format!("{}/health_check", &address))
        .send()
        .await
        .expect("Failed to execute request.");

    assert!(response.status().is_success());
    assert_eq!(Some(0), response.content_length());
}

#[actix_rt::test]
async fn requisition_returns_a_200_for_valid_form_data() {
    let address = spawn_app();
    let client = reqwest::Client::new();
    let body = "id=x&from=y&to=z";

    let response = client
        .post(&format!("{}/requisition", &address))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await
        .expect("Failed to execute request.");

    assert_eq!(200, response.status().as_u16());
}

#[actix_rt::test]
async fn requisition_returns_a_400_when_data_is_missing() {
    let address = spawn_app();
    let client = reqwest::Client::new();
    let test_cases = vec![
        ("id=x", "missing the from store and the to store"),
        ("from=y", "missing the id and the to store"),
        ("to=z", "missing the id and the from store"),
        ("id=x&from=y", "missing the to store"),
        ("id=x&to=z", "missing the from store"),
        ("from=y&to=z", "missing the id"),
    ];

    for (invalid_body, error_message) in test_cases {
        let response = client
            .post(&format!("{}/requisition", &address))
            .header("Content-Type", "application/x-www-form-urlencoded")
            .body(invalid_body)
            .send()
            .await
            .expect("Failed to execute request.");

        assert_eq!(
            400,
            response.status().as_u16(),
            "Requisition endpoint did not fail with 400 Bad Request when the payload was {}.",
            error_message
        );
    }
}
