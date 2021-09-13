pub mod schema;

use actix_web::{guard::fn_guard, web::Data, HttpResponse, Result};
use async_graphql::http::{playground_source, GraphQLPlaygroundConfig};
use async_graphql::Context;
use async_graphql_actix_web::{Request, Response};

use self::schema::Schema;
use crate::server::data::{LoaderRegistry, RepositoryRegistry};

// Sugar that helps make things neater and avoid errors that would only crop up at runtime.
trait ContextExt {
    fn get_repository<T: anymap::any::Any + Send + Sync>(&self) -> &T;
    fn get_loader<T: anymap::any::Any + Send + Sync>(&self) -> &T;
}

impl<'a> ContextExt for Context<'a> {
    fn get_repository<T: anymap::any::Any + Send + Sync>(&self) -> &T {
        self.data_unchecked::<Data<RepositoryRegistry>>().get::<T>()
    }

    fn get_loader<T: anymap::any::Any + Send + Sync>(&self) -> &T {
        self.data_unchecked::<Data<LoaderRegistry>>().get::<T>()
    }
}

pub fn config(
    repository_registry: Data<RepositoryRegistry>,
    loader_registry: Data<LoaderRegistry>,
) -> impl FnOnce(&mut actix_web::web::ServiceConfig) {
    |cfg| {
        let schema = Schema::build(
            schema::Queries,
            schema::Mutations,
            async_graphql::EmptySubscription,
        )
        .data(repository_registry)
        .data(loader_registry)
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

async fn graphql(schema: Data<Schema>, req: Request) -> Response {
    schema.execute(req.into_inner()).await.into()
}

async fn playground() -> Result<HttpResponse> {
    Ok(HttpResponse::Ok()
        .content_type("text/html; charset=utf-8")
        .body(playground_source(GraphQLPlaygroundConfig::new("/graphql"))))
}
