#[cfg(test)]
mod tests;

use std::sync::Arc;

use actix_web::web::{self, Data};
use actix_web::HttpResponse;
use actix_web::{guard, HttpRequest};
use async_graphql::extensions::{
    Extension, ExtensionContext, ExtensionFactory, Logger, NextExecute,
};
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::MergedObject;
use async_graphql::{EmptySubscription, SchemaBuilder};
use async_graphql_actix_web::{GraphQLRequest, GraphQLResponse};
use graphql_batch_mutations::BatchMutations;
use graphql_core::loader::LoaderRegistry;
use graphql_core::{auth_data_from_request, RequestUserData, SelfRequest};
use graphql_general::{
    GeneralQueries, ServerAdminMutations, ServerAdminQueries, ServerAdminStage0Mutations,
    ServerAdminStage0Queries, SyncInfoQueries,
};
use graphql_invoice::{InvoiceMutations, InvoiceQueries};
use graphql_invoice_line::InvoiceLineMutations;
use graphql_location::{LocationMutations, LocationQueries};
use graphql_reports::ReportQueries;
use graphql_requisition::{RequisitionMutations, RequisitionQueries};
use graphql_requisition_line::RequisitionLineMutations;
use graphql_stocktake::{StocktakeMutations, StocktakeQueries};
use graphql_stocktake_line::StocktakeLineMutations;

use log::info;
use repository::StorageConnectionManager;
use service::auth_data::AuthData;
use service::service_provider::ServiceProvider;
use service::settings::Settings;
use tokio::sync::mpsc::Sender;

#[derive(MergedObject, Default, Clone)]
pub struct FullQuery(
    pub SyncInfoQueries,
    pub InvoiceQueries,
    pub LocationQueries,
    pub StocktakeQueries,
    pub GeneralQueries,
    pub RequisitionQueries,
    pub ReportQueries,
    pub ServerAdminQueries,
);

#[derive(MergedObject, Default, Clone)]
pub struct FullMutation(
    pub InvoiceMutations,
    pub InvoiceLineMutations,
    pub LocationMutations,
    pub StocktakeMutations,
    pub StocktakeLineMutations,
    pub BatchMutations,
    pub RequisitionMutations,
    pub RequisitionLineMutations,
    pub ServerAdminMutations,
);

pub type Schema = async_graphql::Schema<FullQuery, FullMutation, async_graphql::EmptySubscription>;
type Builder = SchemaBuilder<FullQuery, FullMutation, EmptySubscription>;

pub fn full_query() -> FullQuery {
    FullQuery(
        SyncInfoQueries,
        InvoiceQueries,
        LocationQueries,
        StocktakeQueries,
        GeneralQueries,
        RequisitionQueries,
        ReportQueries,
        ServerAdminQueries,
    )
}

pub fn full_mutation() -> FullMutation {
    FullMutation(
        InvoiceMutations,
        InvoiceLineMutations,
        LocationMutations,
        StocktakeMutations,
        StocktakeLineMutations,
        BatchMutations,
        RequisitionMutations,
        RequisitionLineMutations,
        ServerAdminMutations,
    )
}

pub struct ResponseLogger;
impl ExtensionFactory for ResponseLogger {
    fn create(&self) -> Arc<dyn Extension> {
        Arc::new(ResponseLoggerExtension)
    }
}
struct ResponseLoggerExtension;
#[async_trait::async_trait]
impl Extension for ResponseLoggerExtension {
    async fn execute(
        &self,
        ctx: &ExtensionContext<'_>,
        operation_name: Option<&str>,
        next: NextExecute<'_>,
    ) -> async_graphql::Response {
        let resp = next.run(ctx, operation_name).await;
        info!(
            target: "async-graphql",
            "[Execute Response] {:?}\nresponse_length: {}", operation_name, format!("{:?}", resp).len()
        );
        resp
    }
}

pub fn schema_builder() -> Builder {
    Schema::build(full_query(), full_mutation(), EmptySubscription)
}

pub fn build_schema(
    connection_manager: Data<StorageConnectionManager>,
    loader_registry: Data<LoaderRegistry>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
    settings_data: Data<Settings>,
    restart_switch: Data<Sender<bool>>,
    self_request: Option<Data<Box<dyn SelfRequest>>>,
    include_logger: bool,
) -> Schema {
    let mut builder = schema_builder()
        .data(connection_manager)
        .data(loader_registry)
        .data(service_provider)
        .data(auth_data)
        .data(settings_data)
        .data(restart_switch);

    match self_request {
        Some(self_request) => builder = builder.data(self_request),
        None => {}
    }
    if include_logger {
        builder = builder.extension(Logger).extension(ResponseLogger);
    }
    builder.finish()
}

pub type SchemaStage0 = async_graphql::Schema<
    ServerAdminStage0Queries,
    ServerAdminStage0Mutations,
    async_graphql::EmptySubscription,
>;

pub fn build_schema_stage0(
    connection_manager: Data<StorageConnectionManager>,
    loader_registry: Data<LoaderRegistry>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
    settings_data: Data<Settings>,
    restart_switch: Data<Sender<bool>>,
    self_request: Option<Data<Box<dyn SelfRequest>>>,
    include_logger: bool,
) -> SchemaStage0 {
    let mut builder = SchemaStage0::build(
        ServerAdminStage0Queries,
        ServerAdminStage0Mutations,
        EmptySubscription,
    )
    .data(connection_manager)
    .data(loader_registry)
    .data(service_provider)
    .data(auth_data)
    .data(settings_data)
    .data(restart_switch);

    match self_request {
        Some(self_request) => builder = builder.data(self_request),
        None => {}
    }
    if include_logger {
        builder = builder.extension(Logger).extension(ResponseLogger);
    }
    builder.finish()
}

struct SelfRequestImpl {
    schema: Schema,
}
#[async_trait::async_trait]
impl SelfRequest for SelfRequestImpl {
    async fn call(
        &self,
        request: async_graphql::Request,
        user_data: RequestUserData,
    ) -> async_graphql::Response {
        let query = request.data(user_data);
        self.schema.execute(query).await.into()
    }
}

pub fn config_stage0(
    connection_manager: Data<StorageConnectionManager>,
    loader_registry: Data<LoaderRegistry>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
    settings_data: Data<Settings>,
    restart_switch: Data<Sender<bool>>,
) -> impl FnOnce(&mut actix_web::web::ServiceConfig) {
    |cfg| {
        let schema = build_schema_stage0(
            connection_manager,
            loader_registry,
            service_provider,
            auth_data,
            settings_data,
            restart_switch,
            None,
            true,
        );

        cfg.app_data(Data::new(schema))
            .service(web::resource("/graphql").guard(guard::Post()).to(
                |schema: Data<SchemaStage0>, http_req, req: GraphQLRequest| {
                    graphql(schema, http_req, req)
                },
            ))
            .service(web::resource("/graphql").guard(guard::Get()).to(playground));
    }
}

pub fn config(
    connection_manager: Data<StorageConnectionManager>,
    loader_registry: Data<LoaderRegistry>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
    settings_data: Data<Settings>,
    restart_switch: Data<Sender<bool>>,
) -> impl FnOnce(&mut actix_web::web::ServiceConfig) {
    |cfg| {
        let self_requester: Data<Box<dyn SelfRequest>> = Data::new(Box::new(SelfRequestImpl {
            schema: build_schema(
                connection_manager.clone(),
                loader_registry.clone(),
                service_provider.clone(),
                auth_data.clone(),
                settings_data.clone(),
                restart_switch.clone(),
                None,
                false,
            ),
        }));

        let schema = build_schema(
            connection_manager,
            loader_registry,
            service_provider,
            auth_data,
            settings_data,
            restart_switch,
            Some(self_requester),
            true,
        );

        cfg.app_data(Data::new(schema))
            .service(web::resource("/graphql").guard(guard::Post()).to(
                |schema: Data<Schema>, http_req, req: GraphQLRequest| {
                    graphql(schema, http_req, req)
                },
            ))
            .service(web::resource("/graphql").guard(guard::Get()).to(playground));
    }
}

async fn playground() -> HttpResponse {
    HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(playground_source(GraphQLPlaygroundConfig::new("/graphql")))
}

async fn graphql<
    Query: 'static + async_graphql::ObjectType,
    Mutation: 'static + async_graphql::ObjectType,
    Subscription: 'static + async_graphql::SubscriptionType,
>(
    schema: Data<async_graphql::Schema<Query, Mutation, Subscription>>,
    http_req: HttpRequest,
    req: GraphQLRequest,
) -> GraphQLResponse {
    let user_data = auth_data_from_request(&http_req);
    let query = req.into_inner().data(user_data);
    schema.execute(query).await.into()
}

#[cfg(test)]
mod test {
    use graphql_core::{assert_graphql_query, test_helpers::setup_graphl_test};
    use repository::mock::MockDataInserts;
    use serde_json::json;

    use crate::{full_mutation, full_query};

    #[actix_rt::test]
    async fn test_graphql_version() {
        // This test should also checks that there are no duplicate types (which will be a panic when schema is built)
        let (_, _, _, settings) = setup_graphl_test(
            full_query(),
            full_mutation(),
            "graphql_requisition_user_loader",
            MockDataInserts::none(),
        )
        .await;
        let expected = json!({
            "apiVersion": "1.0"
        });

        let query = r#"
        query {
            apiVersion
        }
        "#;

        assert_graphql_query!(&settings, &query, &None, expected, None);
    }
}
