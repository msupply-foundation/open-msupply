use server::settings::Settings;

use graphql::{
    config as graphql_config,
    loader::{get_loaders, LoaderRegistry},
};
use repository::{get_storage_connection_manager, StorageConnectionManager};
use service::{
    auth_data::AuthData,
    location::{
        insert::InsertLocationServiceTrait, update::UpdateLocationServiceTrait,
        LocationQueryServiceTrait,
    },
    service_provider::{ServiceConnection, ServiceFactory, ServiceFactoryTrait, ServiceProvider},
    token_bucket::TokenBucket,
};

use std::sync::RwLock;

use actix_web::{test::read_body, web::Data};
use assert_json_diff::assert_json_eq;
use serde::{de::DeserializeOwned, Serialize};
use serde_json::{json, Value};

pub mod common;
mod inbound_shipment_delete;
mod inbound_shipment_insert;
mod inbound_shipment_line_delete;
mod inbound_shipment_line_insert;
mod inbound_shipment_line_update;
mod inbound_shipment_update;
mod invoice_query;
mod invoices;
mod items;
mod location_insert;
mod location_update;
mod locations;
mod names;
mod outbound_shipment_delete;
mod outbound_shipment_insert;
mod outbound_shipment_line_delete;
mod outbound_shipment_line_insert;
mod outbound_shipment_line_update;
mod outbound_shipment_update;
mod pagination;
mod requisition;

pub async fn get_gql_result<IN, OUT>(settings: &Settings, query: IN) -> OUT
where
    IN: Serialize,
    OUT: DeserializeOwned,
{
    let connection_manager = get_storage_connection_manager(&settings.database);
    let loaders = get_loaders(&connection_manager).await;

    let connection_manager_data = actix_web::web::Data::new(connection_manager.clone());
    let loader_registry = actix_web::web::Data::new(LoaderRegistry { loaders });
    let service_provider_data =
        actix_web::web::Data::new(ServiceProvider::new(connection_manager.clone()));

    let auth_data = Data::new(AuthData {
        auth_token_secret: settings.auth.token_secret.to_owned(),
        token_bucket: RwLock::new(TokenBucket::new()),
        // TODO: configure ssl
        debug_no_ssl: true,
        debug_no_access_control: true,
    });

    let mut app = actix_web::test::init_service(
        actix_web::App::new()
            .data(connection_manager_data.clone())
            .data(loader_registry.clone())
            .configure(graphql_config(
                connection_manager_data,
                loader_registry,
                service_provider_data,
                auth_data,
            )),
    )
    .await;

    let res = actix_web::test::TestRequest::post()
        .header("content-type", "application/json")
        .set_json(&query)
        .uri("/graphql")
        .send_request(&mut app)
        .await;

    let body = read_body(res).await;

    let body_as_string = String::from_utf8(body.clone().to_vec()).unwrap();

    match serde_json::from_slice(&body) {
        Ok(result) => result,
        Err(error) => panic!("failed to deserialize: {} {:#?}", body_as_string, error),
    }
}

async fn run_gql_query(
    settings: &Settings,
    query: &str,
    variables: &Option<serde_json::Value>,
    service_override: Option<ServiceOverride>,
) -> serde_json::Value {
    let connection_manager = get_storage_connection_manager(&settings.database);
    let loaders = get_loaders(&connection_manager).await;
    let services_provider = get_test_services(connection_manager.clone(), service_override);

    let connection_manager_data = actix_web::web::Data::new(connection_manager);
    let loader_registry = actix_web::web::Data::new(LoaderRegistry { loaders });
    let services_provider_data = actix_web::web::Data::new(services_provider);

    let auth_data = Data::new(AuthData {
        auth_token_secret: settings.auth.token_secret.to_owned(),
        token_bucket: RwLock::new(TokenBucket::new()),
        // TODO: configure ssl
        debug_no_ssl: true,
        debug_no_access_control: true,
    });

    let mut app = actix_web::test::init_service(
        actix_web::App::new()
            .data(connection_manager_data.clone())
            .data(loader_registry.clone())
            .configure(graphql_config(
                connection_manager_data,
                loader_registry,
                services_provider_data,
                auth_data,
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
    service_override: Option<ServiceOverride>,
) -> serde_json::Value {
    let actual = run_gql_query(settings, query, variables, service_override).await;
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
    service_override: Option<ServiceOverride>,
) -> serde_json::Value {
    let actual = run_gql_query(settings, query, variables, service_override).await;
    // println!("{}", serde_json::to_string_pretty(&actual).unwrap());
    assert_gql_no_response_error(&actual);
    let expected_with_data = json!({
        "data": expected,
    });
    assert_json_eq!(&actual, expected_with_data);
    actual
}

type CreateService<S> = Box<dyn Fn() -> Box<S> + Sync + Send>;
pub struct ServiceOverride {
    location_query_service: Option<CreateService<dyn LocationQueryServiceTrait>>,
    insert_location_service: Option<CreateService<dyn InsertLocationServiceTrait>>,
    update_location_service: Option<CreateService<dyn UpdateLocationServiceTrait>>,
}

impl ServiceOverride {
    pub fn new() -> Self {
        ServiceOverride {
            location_query_service: None,
            insert_location_service: None,
            update_location_service: None,
        }
    }

    pub fn set_location_query_service(
        mut self,
        location_query_service: CreateService<dyn LocationQueryServiceTrait>,
    ) -> Self {
        self.location_query_service = Some(location_query_service);
        self
    }

    pub fn set_insert_location_service(
        mut self,
        insert_location_service: CreateService<dyn InsertLocationServiceTrait>,
    ) -> Self {
        self.insert_location_service = Some(insert_location_service);
        self
    }

    pub fn set_update_location_service(
        mut self,
        update_location_service: CreateService<dyn UpdateLocationServiceTrait>,
    ) -> Self {
        self.update_location_service = Some(update_location_service);
        self
    }
}

impl ServiceFactoryTrait for ServiceOverride {
    fn location_query<'a>(
        &self,
        service_connection: ServiceConnection<'a>,
    ) -> Box<dyn LocationQueryServiceTrait + 'a> {
        if let Some(location_query_service) = &self.location_query_service {
            location_query_service()
        } else {
            ServiceFactory {}.location_query(service_connection)
        }
    }

    fn insert_location<'a>(
        &'a self,
        service_connection: ServiceConnection<'a>,
    ) -> Box<dyn InsertLocationServiceTrait + 'a> {
        if let Some(insert_location_service) = &self.insert_location_service {
            insert_location_service()
        } else {
            ServiceFactory {}.insert_location(service_connection)
        }
    }

    fn update_location<'a>(
        &'a self,
        service_connection: ServiceConnection<'a>,
    ) -> Box<dyn UpdateLocationServiceTrait + 'a> {
        if let Some(update_location_service) = &self.update_location_service {
            update_location_service()
        } else {
            ServiceFactory {}.update_location(service_connection)
        }
    }
}

fn get_test_services(
    connection_manager: StorageConnectionManager,
    service_factory_override: Option<ServiceOverride>,
) -> ServiceProvider {
    let mut service_provider = ServiceProvider::new(connection_manager);

    if let Some(service_factory_override) = service_factory_override {
        service_provider.service_factory = Box::new(service_factory_override);
    }

    service_provider
}

use chrono::{DateTime as ChronoDateTime, NaiveDate, Utc};
use graphql_client::GraphQLQuery;
type DateTime = ChronoDateTime<Utc>;
#[derive(GraphQLQuery)]
#[graphql(
    schema_path = "../graphql/graphql_schema/schema.graphql",
    query_path = "../graphql/graphql_schema/query.graphql",
    response_derives = "Debug,PartialEq,Clone,Serialize",
    variables_derives = "Debug,PartialEq,Clone",
    normalization = "Rust"
)]
pub struct InsertInboundShipmentFull;

#[derive(GraphQLQuery)]
#[graphql(
    schema_path = "../graphql/graphql_schema/schema.graphql",
    query_path = "../graphql/graphql_schema/query.graphql",
    response_derives = "Debug,PartialEq,Clone,Serialize",
    variables_derives = "Debug,PartialEq,Clone",
    normalization = "Rust"
)]
pub struct UpdateInboundShipmentFull;

#[derive(GraphQLQuery)]
#[graphql(
    schema_path = "../graphql/graphql_schema/schema.graphql",
    query_path = "../graphql/graphql_schema/query.graphql",
    response_derives = "Debug,PartialEq,Clone,Serialize",
    variables_derives = "Debug,PartialEq,Clone",
    normalization = "Rust"
)]
pub struct DeleteInboundShipmentFull;

#[derive(GraphQLQuery)]
#[graphql(
    schema_path = "../graphql/graphql_schema/schema.graphql",
    query_path = "../graphql/graphql_schema/query.graphql",
    response_derives = "Debug,PartialEq,Clone,Serialize",
    variables_derives = "Debug,PartialEq,Clone",
    normalization = "Rust"
)]
pub struct InsertInboundShipmentLineFull;

#[derive(GraphQLQuery)]
#[graphql(
    schema_path = "../graphql/graphql_schema/schema.graphql",
    query_path = "../graphql/graphql_schema/query.graphql",
    response_derives = "Debug,PartialEq,Clone,Serialize",
    variables_derives = "Debug,PartialEq,Clone",
    normalization = "Rust"
)]
pub struct UpdateInboundShipmentLineFull;

#[derive(GraphQLQuery)]
#[graphql(
    schema_path = "../graphql/graphql_schema/schema.graphql",
    query_path = "../graphql/graphql_schema/query.graphql",
    response_derives = "Debug,PartialEq,Clone,Serialize",
    variables_derives = "Debug,PartialEq,Clone",
    normalization = "Rust"
)]
pub struct InvoiceFull;

#[derive(GraphQLQuery)]
#[graphql(
    schema_path = "../graphql/graphql_schema/schema.graphql",
    query_path = "../graphql/graphql_schema/query.graphql",
    response_derives = "Debug,PartialEq,Clone,Serialize",
    variables_derives = "Debug,PartialEq,Clone",
    normalization = "Rust"
)]
pub struct DeleteInboundShipmentLineFull;

#[derive(GraphQLQuery)]
#[graphql(
    schema_path = "../graphql/graphql_schema/schema.graphql",
    query_path = "../graphql/graphql_schema/query.graphql",
    response_derives = "Debug,PartialEq,Clone,Serialize",
    variables_derives = "Debug,PartialEq,Clone",
    normalization = "Rust"
)]
pub struct UpdateOutboundShipmentLineFull;

#[derive(GraphQLQuery)]
#[graphql(
    schema_path = "../graphql/graphql_schema/schema.graphql",
    query_path = "../graphql/graphql_schema/query.graphql",
    response_derives = "Debug,PartialEq,Clone,Serialize",
    variables_derives = "Debug,PartialEq,Clone",
    normalization = "Rust"
)]
pub struct InsertOutboundShipmentLineFull;

#[derive(GraphQLQuery)]
#[graphql(
    schema_path = "../graphql/graphql_schema/schema.graphql",
    query_path = "../graphql/graphql_schema/query.graphql",
    response_derives = "Debug,PartialEq,Clone,Serialize",
    variables_derives = "Debug,PartialEq,Clone",
    normalization = "Rust"
)]
pub struct DeleteOutboundShipmentLineFull;
