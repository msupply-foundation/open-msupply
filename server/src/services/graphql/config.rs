//! src/services/graphql/config.rs

use crate::services::graphql::routes;
use crate::services::graphql::schema::{Mutations, Queries, Schema, Subscriptions};

pub fn config(cfg: &mut actix_web::web::ServiceConfig) {
    let schema = Schema::new(Queries, Mutations, Subscriptions::new());
    cfg.service(
        actix_web::web::scope(routes::paths::GRAPHQL)
            .data(schema)
            .route("", actix_web::web::post().to(routes::handlers::graphql))
            .route("", actix_web::web::get().to(routes::handlers::graphql)),
    );
}
