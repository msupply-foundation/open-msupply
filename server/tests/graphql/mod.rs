use remote_server::{
    database::{loader::get_loaders, repository::get_repositories},
    server::{
        data::{LoaderRegistry, RepositoryRegistry},
        service::graphql::config as graphql_config,
    },
    util::settings::Settings,
};

use assert_json_diff::assert_json_eq;
use serde_json::{json, Value};

mod customer_invoice_delete;
mod customer_invoice_insert;
mod invoice_query;
mod invoices;
mod names;
mod requisition;

async fn run_gql_query(
    settings: &Settings,
    query: &str,
    variables: &Option<serde_json::Value>,
) -> serde_json::Value {
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

    let mut payload: String;
    if let Some(variables) = variables {
        payload = format!(
            "{{\"query\":\"{}\",\"variables\":{}}}",
            query,
            variables.to_string()
        );
    } else {
        payload = format!("{{\"query\":\"{}\"}}", query);
    }
    payload = payload.replace("\n", "");

    let req = actix_web::test::TestRequest::post()
        .header("content-type", "application/json")
        .set_payload(payload)
        .uri("/graphql")
        .to_request();

    let res = actix_web::test::read_response(&mut app, req).await;
    let body = String::from_utf8(res.to_vec()).expect("Failed to parse response");
    serde_json::from_str::<Value>(&body).expect(body.as_str())
}

async fn assert_gql_not_found(
    settings: &Settings,
    query: &str,
    variables: &Option<serde_json::Value>,
) -> serde_json::Value {
    let actual = run_gql_query(settings, query, variables).await;
    let error_message = actual["data"].to_string();
    assert!(error_message.contains("RecordNotFound"));
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
    variables: &Option<serde_json::Value>,
    expected: &serde_json::Value,
) -> serde_json::Value {
    let actual = run_gql_query(settings, query, variables).await;
    assert_gql_no_response_error(&actual);
    let expected_with_data = json!({
        "data": expected,
    });
    assert_json_eq!(&actual, expected_with_data);
    actual
}
