mod mutations;
mod queries;

use actix_web::web::Data;
use actix_web::HttpRequest;
use actix_web::{guard::fn_guard, HttpResponse, Result};
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::MergedObject;
use async_graphql::{EmptySubscription, SchemaBuilder};
use async_graphql_actix_web::{Request, Response};
use graphql_core::auth_data_from_request;
use graphql_core::loader::LoaderRegistry;
use graphql_invoice::InvoiceQueries;
use mutations::Mutations;
use queries::Queries;
use repository::StorageConnectionManager;
use service::auth_data::AuthData;
use service::service_provider::ServiceProvider;

#[derive(MergedObject, Default)]
pub struct FullQuery(pub Queries, pub InvoiceQueries);

pub type Schema = async_graphql::Schema<FullQuery, Mutations, async_graphql::EmptySubscription>;
type Builder = SchemaBuilder<FullQuery, Mutations, EmptySubscription>;

pub fn build_schema() -> Builder {
    Schema::build(
        FullQuery(Queries, InvoiceQueries),
        Mutations,
        EmptySubscription,
    )
}

pub fn config(
    connection_manager: Data<StorageConnectionManager>,
    loader_registry: Data<LoaderRegistry>,
    service_provider: Data<ServiceProvider>,
    auth_data: Data<AuthData>,
) -> impl FnOnce(&mut actix_web::web::ServiceConfig) {
    |cfg| {
        let schema = build_schema()
            .data(connection_manager)
            .data(loader_registry)
            .data(service_provider)
            .data(auth_data)
            .finish();
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
