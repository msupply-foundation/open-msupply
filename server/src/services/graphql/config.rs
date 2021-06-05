//! src/services/graphql/config.rs

use crate::services::graphql::routes::graphql_route;
use crate::services::graphql::schema::{Mutations, Queries, Schema, Subscriptions};

pub fn config(cfg: &mut actix_web::web::ServiceConfig) {
    let schema = Schema::new(Queries, Mutations, Subscriptions::new());
    cfg.service(
        actix_web::web::scope("/graphql")
            .data(schema)
            .route("", actix_web::web::post().to(graphql_route))
            .route("", actix_web::web::get().to(graphql_route)),
    );
}
