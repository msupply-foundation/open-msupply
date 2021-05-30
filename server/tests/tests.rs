//! tests/health_check.rs
use once_cell::sync::Lazy;
use omsupply_server::configuration::{get_configuration, DatabaseSettings};
use omsupply_server::startup::run;
use omsupply_server::telemetry::{get_subscriber, init_subscriber};
use sqlx::{Connection, Executor, PgConnection, PgPool};
use std::net::TcpListener;
use uuid::Uuid;

static TRACING: Lazy<()> = Lazy::new(|| {
    let default_filter_level = "info".to_string();
    let subscriber_name = "test".to_string();

    if std::env::var("TEST_LOG").is_ok() {
        let subscriber = get_subscriber(subscriber_name, default_filter_level, std::io::stdout);
        init_subscriber(subscriber);
    } else {
        let subscriber = get_subscriber(subscriber_name, default_filter_level, std::io::sink);
        init_subscriber(subscriber);
    }
});

pub struct TestApp {
    pub address: String,
    pub connection_pool: PgPool,
}

async fn spawn_app() -> TestApp {
    Lazy::force(&TRACING);

    let listener = TcpListener::bind("127.0.0.1:0").expect("Failed to bind random port");
    let port = listener.local_addr().unwrap().port();
    let address = format!("http://127.0.0.1:{}", port);

    let mut configuration = get_configuration().expect("Failed to read configuration.");
    configuration.database.database_name = Uuid::new_v4().to_string();
    let connection_pool = configure_database(&configuration.database).await;

    let server = run(listener, connection_pool.clone()).expect("Failed to bind address");
    let _ = tokio::spawn(server);

    TestApp {
        address,
        connection_pool,
    }
}

pub async fn configure_database(config: &DatabaseSettings) -> PgPool {
    let mut connection = PgConnection::connect(&config.connection_string_without_db())
        .await
        .expect("Failed to connect to Postgres");
    connection
        .execute(&*format!(r#"CREATE DATABASE "{}";"#, config.database_name))
        .await
        .expect("Failed to create database.");

    let connection_pool = PgPool::connect(&config.connection_string())
        .await
        .expect("Failed to connect to Postgres.");

    sqlx::migrate!("./migrations")
        .run(&connection_pool)
        .await
        .expect("Failed to migrate the database");

    connection_pool
}

#[actix_rt::test]
async fn health_check_works() {
    let app = spawn_app().await;
    let client = reqwest::Client::new();

    let response = client
        .get(&format!("{}/health_check", &app.address))
        .send()
        .await
        .expect("Failed to execute request.");

    assert!(response.status().is_success());
    assert_eq!(Some(0), response.content_length());
}

#[actix_rt::test]
async fn requisition_returns_a_200_for_valid_form_data() {
    let app = spawn_app().await;
    let client = reqwest::Client::new();

    let id = Uuid::new_v4();
    let from_id = Uuid::new_v4();
    let to_id = Uuid::new_v4();

    let body = format!("id={}&from_id={}&to_id={}", id, from_id, to_id);

    let response = client
        .post(&format!("{}/requisition", &app.address))
        .header("Content-Type", "application/x-www-form-urlencoded")
        .body(body)
        .send()
        .await
        .expect("Failed to execute request.");

    assert_eq!(200, response.status().as_u16());

    let saved = sqlx::query!("SELECT id, from_id, to_id FROM requisition")
        .fetch_one(&app.connection_pool)
        .await
        .expect("Failed to fetch saved subscription.");

    assert_eq!(saved.id, id);
    assert_eq!(saved.from_id, from_id);
    assert_eq!(saved.to_id, to_id);
}

#[actix_rt::test]
async fn requisition_returns_a_400_when_data_is_missing() {
    let app = spawn_app().await;
    let client = reqwest::Client::new();

    let id = Uuid::new_v4();
    let from_id = Uuid::new_v4();
    let to_id = Uuid::new_v4();

    let test_cases = vec![
        (format!("id={}", id), "missing from_id and to_id"),
        (format!("from_id={}", from_id), "missing id and to_id"),
        (format!("to_id={}", to_id), "missing id and from_id"),
        (format!("id={}&from_id={}", to_id, from_id), "missing to_id"),
        (format!("id={}&to_id={}", id, to_id), "missing from_id"),
        (format!("from_id={}&to_id={}", from_id, to_id), "missing id"),
    ];

    for (invalid_body, error_message) in test_cases {
        let response = client
            .post(&format!("{}/requisition", &app.address))
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
