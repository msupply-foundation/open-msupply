use remote_server::{
    database::{loader::get_loaders, repository::get_repositories},
    server::{
        data::{LoaderRegistry, RepositoryRegistry},
        service::graphql::config as graphql_config,
    },
    util::settings::Settings,
};

use assert_json_diff::assert_json_eq;
use serde_json::Value;

mod invoice_query;
mod invoices;
mod requisition;

async fn run_gql_query(settings: &Settings, query: &str) -> serde_json::Value {
    let repositories = get_repositories(settings).await;
    let loaders = get_loaders(settings).await;

    let repository_registry = actix_web::web::Data::new(RepositoryRegistry { repositories });
    let loader_registry = actix_web::web::Data::new(LoaderRegistry { loaders });

    let mut app = actix_web::test::init_service(
        actix_web::App::new()
            .data(repository_registry.clone())
            .data(loader_registry.clone())
            .configure(graphql_config(repository_registry, loader_registry)),
    )
    .await;

    let query = query.replace("\n", "");
    let payload = format!("{{\"query\":\"{}\"}}", query);
    let req = actix_web::test::TestRequest::post()
        .header("content-type", "application/json")
        .set_payload(payload)
        .uri("/graphql")
        .to_request();

    let res = actix_web::test::read_response(&mut app, req).await;
    let body = String::from_utf8(res.to_vec()).expect("Failed to parse response");
    serde_json::from_str::<Value>(&body).unwrap()
}

async fn assert_gql_not_found(settings: &Settings, query: &str) -> serde_json::Value {
    let actual = run_gql_query(settings, query).await;
    let error_message = actual["errors"][0]["message"].to_string();
    assert!(error_message.contains("row not found"));
    actual
}

fn assert_gql_no_response_error(value: &serde_json::Value) {
    if let Some(errors) = value.get("errors") {
        assert!(false, "{}", errors.to_string());
    }
}

async fn assert_gql_query(
    settings: &Settings,
    query: &str,
    expected: &serde_json::Value,
) -> serde_json::Value {
    let actual = run_gql_query(settings, query).await;
    assert_gql_no_response_error(&actual);
    assert_json_eq!(&actual, expected);
    actual
}
