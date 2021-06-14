use crate::server::services::graphql::routes::{handlers, paths};
use crate::server::services::graphql::schema::{Mutations, Queries, Schema, Subscriptions};

pub fn config(cfg: &mut actix_web::web::ServiceConfig) {
    let schema = Schema::new(Queries, Mutations, Subscriptions::new());
    cfg.service(
        actix_web::web::scope(paths::GRAPHQL)
            .data(schema)
            .route("", actix_web::web::post().to(handlers::graphql))
            .route("", actix_web::web::get().to(handlers::graphql)),
    );
}
