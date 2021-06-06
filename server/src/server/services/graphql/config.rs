//! src/services/graphql/config.rs

use crate::server::services::graphql::routes::{paths, handlers};
use crate::server::services::graphql::schema::{Schema, Queries, Mutations, Subscriptions};

pub fn config(cfg: &mut actix_web::web::ServiceConfig) {
    let schema = Schema::new(Queries, Mutations, Subscriptions::new());
    cfg.service(
        actix_web::web::scope(paths::GRAPHQL)
            .data(schema)
            .route("", actix_web::web::post().to(handlers::graphql))
            .route("", actix_web::web::get().to(handlers::graphql)),
    );
}
