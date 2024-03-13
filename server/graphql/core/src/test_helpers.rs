use std::sync::{Arc, RwLock};

use actix_web::{
    guard,
    web::{self, Data},
    HttpRequest,
};
use async_graphql::{EmptySubscription, ObjectType, Schema};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse};
use repository::{
    mock::{MockData, MockDataCollection, MockDataInserts},
    test_db::setup_all_with_data,
    StorageConnection, StorageConnectionManager,
};

use service::{auth_data::AuthData, service_provider::ServiceProvider, token_bucket::TokenBucket};

use crate::{
    auth_data_from_request,
    loader::{get_loaders, LoaderRegistry},
};

pub struct TestGraphlSettings<Q: 'static + ObjectType + Clone, M: 'static + ObjectType + Clone> {
    pub queries: Q,
    pub mutations: M,
    pub connection_manager: StorageConnectionManager,
}

pub async fn run_test_gql_query<
    Q: 'static + ObjectType + Clone,
    M: 'static + ObjectType + Clone,
>(
    settings: &TestGraphlSettings<Q, M>,
    query: &str,
    variables: &Option<serde_json::Value>,
    service_provider_override: Option<ServiceProvider>,
) -> serde_json::Value {
    let connection_manager = settings.connection_manager.clone();
    let connection_manager_data = Data::new(connection_manager.clone());

    let service_provider_data = Data::new(match service_provider_override {
        Some(service_provider) => service_provider,
        None => ServiceProvider::new(connection_manager.clone(), "app_data"),
    });

    let loaders = get_loaders(&connection_manager, service_provider_data.clone()).await;
    let loader_registry_data = actix_web::web::Data::new(LoaderRegistry { loaders });

    let auth_data = Data::new(AuthData {
        auth_token_secret: "n/a".to_string(),
        token_bucket: Arc::new(RwLock::new(TokenBucket::new())),
        // TODO: configure ssl
        no_ssl: true,
        debug_no_access_control: true,
    });

    let mut app = actix_web::test::init_service(
        actix_web::App::new()
            .app_data(Data::new(
                Schema::build(
                    settings.queries.clone(),
                    settings.mutations.clone(),
                    EmptySubscription,
                )
                .data(connection_manager_data.clone())
                .data(loader_registry_data.clone())
                .data(service_provider_data.clone())
                .data(auth_data.clone())
                .finish(),
            ))
            .service(web::resource("/graphql").guard(guard::Post()).to(
                |schema: Data<Schema<Q, M, EmptySubscription>>, http_req, req: GraphQLRequest| {
                    graphql(schema, http_req, req)
                },
            )),
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
        .set_payload(payload)
        .uri("/graphql")
        .to_request();

    actix_web::test::call_and_read_body_json(&mut app, req).await
}

async fn graphql<Q: 'static + ObjectType + Clone, M: 'static + ObjectType + Clone>(
    schema: Data<Schema<Q, M, EmptySubscription>>,
    http_req: HttpRequest,
    req: GraphQLRequest,
) -> GraphQLResponse {
    let user_data = auth_data_from_request(&http_req);
    let query = req.into_inner().data(user_data);
    schema.execute(query).await.into()
}

#[macro_export]
macro_rules! assert_graphql_query_with_config {
    ($settings:expr, $query:expr, $variables:expr, $expected_inner:expr, $service_provider_override:expr, $config:ident) => {{
        let actual = graphql_core::test_helpers::run_test_gql_query(
            $settings,
            $query,
            $variables,
            $service_provider_override,
        )
        .await;

        match actual.get("errors").and_then(serde_json::Value::as_array) {
            Some(errors) => {
                if !errors.is_empty() {
                    panic!("Request failed with standard error(s): {}",
                        serde_json::to_string_pretty(errors).unwrap());
                }
            },
            None => {}
        }
        let expected = serde_json::json!(
            {
                "data": $expected_inner,
            }
        );

        // Inclusive means only match fields in rhs against lhs (lhs can have more fields)
        match assert_json_diff::assert_json_matches_no_panic(&actual, &expected, $config) {
            Ok(_) => assert!(true),
            Err(error) => {
                panic!(
                    "\n{}\n**actual**\n{}\n**expected**\n{}\n**query**\n{}",
                    error,
                    serde_json::to_string_pretty(&actual).unwrap(),
                    serde_json::to_string_pretty(&expected).unwrap(),
                    $query
                );
            }
        }
    }};
}

#[macro_export]
macro_rules! assert_graphql_query {
    ($settings:expr, $query:expr, $variables:expr, $expected_inner:expr, $service_provider_override:expr) => {{
        // TODO should really re-export dev deps (actix_rt, assert_json_dif, to avoid need to import in consumer)
        let config = assert_json_diff::Config::new(assert_json_diff::CompareMode::Inclusive);
        graphql_core::assert_graphql_query_with_config!($settings, $query, $variables, $expected_inner, $service_provider_override, config);
    }};
}

#[macro_export]
macro_rules! get_invoice_lines_inline {
    ($invoice_id:expr, $connection:expr) => {{
        repository::InvoiceLineRowRepository::new($connection)
            .find_many_by_invoice_id($invoice_id)
            .unwrap()
    }};
}

#[macro_export]
macro_rules! assert_standard_graphql_error {
    // expected_extensions should be an Option<serde_json::json>>
    ($settings:expr, $query:expr, $variables:expr, $expected_message:expr, $expected_extensions:expr, $service_provider_override:expr) => {{
        let actual = graphql_core::test_helpers::run_test_gql_query(
            $settings,
            $query,
            $variables,
            $service_provider_override,
        )
        .await;

        let expected_with_message = serde_json::json!(
            {
                "errors": [{
                    "message": $expected_message,
                    // Need to check that extensions are indeed present,
                    // and if expected_extensions is not, None check content of extensions
                    "extensions": $expected_extensions.unwrap_or(serde_json::json!({}))
                }]
            }
        );
        // Inclusive means only match fields in rhs against lhs (lhs can have more fields)
        let config = assert_json_diff::Config::new(assert_json_diff::CompareMode::Inclusive);

        match assert_json_diff::assert_json_matches_no_panic(
            &actual,
            &expected_with_message,
            config,
        ) {
            Ok(_) => assert!(true),
            Err(error) => {
                panic!(
                    "\n{}\n**actual**\n{}\n**expected**\n{}\n**query**\n{}",
                    error,
                    serde_json::to_string_pretty(&actual).unwrap(),
                    serde_json::to_string_pretty(&expected_with_message).unwrap(),
                    $query
                );
            }
        }
    }};
}

pub async fn setup_graphql_test_with_data<
    Q: 'static + ObjectType + Clone,
    M: 'static + ObjectType + Clone,
>(
    queries: Q,
    mutations: M,
    db_name: &str,
    inserts: MockDataInserts,
    extra_mock_data: MockData,
) -> (
    MockDataCollection,
    StorageConnection,
    StorageConnectionManager,
    TestGraphlSettings<Q, M>,
) {
    let (mock_data, connection, connection_manager, _) =
        setup_all_with_data(db_name, inserts, extra_mock_data).await;

    (
        mock_data,
        connection,
        connection_manager.clone(),
        TestGraphlSettings {
            queries,
            mutations,
            connection_manager,
        },
    )
}

pub async fn setup_graphl_test<Q: 'static + ObjectType + Clone, M: 'static + ObjectType + Clone>(
    queries: Q,
    mutations: M,
    db_name: &str,
    inserts: MockDataInserts,
) -> (
    MockDataCollection,
    StorageConnection,
    StorageConnectionManager,
    TestGraphlSettings<Q, M>,
) {
    setup_graphql_test_with_data(queries, mutations, db_name, inserts, MockData::default()).await
}
