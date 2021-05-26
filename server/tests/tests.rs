//! tests/health_check.rs
use sqlx::{Connection, PgConnection};
use std::net::TcpListener;
use uuid::Uuid;

use rust_server::configuration::get_configuration;
use rust_server::startup::run;

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
    let configuration = get_configuration().expect("Failed to read configuration");
    let connection_string = configuration.database.connection_string();
    let _connection = PgConnection::connect(&connection_string)
        .await
        .expect("Failed to connect to Postgres.");
    let client = reqwest::Client::new();
    let body = format!(
        "id={}&from_id={}&to_id={}",
        Uuid::new_v4(),
        Uuid::new_v4(),
        Uuid::new_v4()
    );


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
        (
            format!("id={}", Uuid::new_v4()),
            "missing from_id and to_id",
        ),
        (
            format!("from_id={}", Uuid::new_v4()),
            "missing id and to_id",
        ),
        (
            format!("to_id={}", Uuid::new_v4()),
            "missing id and from_id",
        ),
        (
            format!("id={}&from_id={}", Uuid::new_v4(), Uuid::new_v4()),
            "missing to_id",
        ),
        (
            format!("id={}&to_id={}", Uuid::new_v4(), Uuid::new_v4()),
            "missing from_id",
        ),
        (
            format!("from_id={}&to_id={}", Uuid::new_v4(), Uuid::new_v4()),
            "missing id",
        ),
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
