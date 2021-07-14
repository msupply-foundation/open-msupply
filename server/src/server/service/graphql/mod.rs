pub mod schema;

use actix_web::{HttpRequest, HttpResponse, Result, web::Payload, web::Data};

use crate::server::data::RepositoryRegistry;
use crate::server::service::graphql::schema::Schema;

pub fn config(cfg: &mut actix_web::web::ServiceConfig) {
    let schema = schema::Schema::new(
        schema::Queries,
        schema::Mutations,
        schema::Subscriptions::new(),
    );
    cfg.service(
        actix_web::web::scope("/graphql")
            .data(schema)
            .route("", actix_web::web::post().to(graphql))
            .route("", actix_web::web::get().to(graphql)),
    );
}

async fn graphql(
    req: HttpRequest,
    payload: Payload,
    schema: Data<Schema>,
    context: Data<RepositoryRegistry>,
) -> Result<HttpResponse> {
    juniper_actix::graphql_handler(&schema, &context, req, payload).await
}
