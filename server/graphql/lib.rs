#[cfg(test)]
mod tests;

use actix_web::web::Data;
use actix_web::HttpRequest;
use actix_web::{guard::fn_guard, HttpResponse, Result};
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::MergedObject;
use async_graphql::{EmptySubscription, SchemaBuilder};
use async_graphql_actix_web::{Request, Response};
use graphql_batch_mutations::BatchMutations;
use graphql_core::loader::LoaderRegistry;
use graphql_core::{auth_data_from_request, RequestUserData, SelfRequest};
use graphql_general::{GeneralMutations, GeneralQueries};
use graphql_invoice::{InvoiceMutations, InvoiceQueries};
use graphql_invoice_line::InvoiceLineMutations;
use graphql_location::{LocationMutations, LocationQueries};
use graphql_reports::ReportQueries;
use graphql_requisition::{RequisitionMutations, RequisitionQueries};
use graphql_requisition_line::RequisitionLineMutations;
use graphql_stocktake::{StocktakeMutations, StocktakeQueries};
use graphql_stocktake_line::StocktakeLineMutations;

use repository::StorageConnectionManager;
use service::auth_data::AuthData;
use service::service_provider::ServiceProvider;

#[derive(MergedObject, Default, Clone)]
pub struct FullQuery(
    pub InvoiceQueries,
    pub LocationQueries,
    pub StocktakeQueries,
    pub GeneralQueries,
    pub RequisitionQueries,
    pub ReportQueries,
);

#[derive(MergedObject, Default, Clone)]
pub struct FullMutation(
    pub InvoiceMutations,
    pub InvoiceLineMutations,
    pub LocationMutations,
    pub StocktakeMutations,
    pub StocktakeLineMutations,
    pub BatchMutations,
    pub GeneralMutations,
    pub RequisitionMutations,
    pub RequisitionLineMutations,
);

pub type Schema = async_graphql::Schema<FullQuery, FullMutation, async_graphql::EmptySubscription>;
type Builder = SchemaBuilder<FullQuery, FullMutation, EmptySubscription>;

pub fn full_query() -> FullQuery {
    FullQuery(
        InvoiceQueries,
        LocationQueries,
        StocktakeQueries,
        GeneralQueries,
        RequisitionQueries,
        ReportQueries,
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
        GeneralMutations,
        RequisitionMutations,
        RequisitionLineMutations,
    )
}

pub fn schema_builder() -> Builder {
    Schema::build(full_query(), full_mutation(), EmptySubscription)
}

pub fn build_schema(
    connection_manager: Data<StorageConnectionManager>,
    loader_registry: Data<LoaderRegistry>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
    self_request: Option<Data<Box<dyn SelfRequest>>>,
) -> Schema {
    let mut builder = schema_builder()
        .data(connection_manager.clone())
        .data(loader_registry.clone())
        .data(service_provider.clone())
        .data(auth_data.clone());
    match self_request {
        Some(self_request) => builder = builder.data(self_request),
        None => {}
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

pub fn config(
    connection_manager: Data<StorageConnectionManager>,
    loader_registry: Data<LoaderRegistry>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> impl FnOnce(&mut actix_web::web::ServiceConfig) {
    |cfg| {
        let self_requester: Data<Box<dyn SelfRequest>> = Data::new(Box::new(SelfRequestImpl {
            schema: build_schema(
                connection_manager.clone(),
                loader_registry.clone(),
                service_provider.clone(),
                auth_data.clone(),
                None,
            ),
        }));

        let schema = build_schema(
            connection_manager,
            loader_registry,
            service_provider,
            auth_data,
            Some(self_requester),
        );

        cfg.service(
            actix_web::web::scope("/graphql")
                .data(schema)
                .route("", actix_web::web::post().to(graphql))
                // It’s nicest to have the playground on the same URL, but if it’s a GET request and
                // there’s a `query` parameter, we want it to be treated as a GraphQL query. The
                // simplest way of doing this is to just require no query string for playground access.
                .route(
                    "",
                    actix_web::web::get()
                        .guard(fn_guard(|head| head.uri.query().is_none()))
                        .to(playground),
                )
                .route("", actix_web::web::get().to(graphql)),
        );
    }
}

async fn graphql(schema: Data<Schema>, http_req: HttpRequest, req: Request) -> Response {
    let user_data = auth_data_from_request(&http_req);
    let query = req.into_inner().data(user_data);
    schema.execute(query).await.into()
}

async fn playground() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(playground_source(
            GraphQLPlaygroundConfig::new("/graphql")
                // allow to set cookies
                .with_setting("request.credentials", "same-origin"),
        )))
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
