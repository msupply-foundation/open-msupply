pub mod routes;
pub mod schema;

pub fn config(cfg: &mut actix_web::web::ServiceConfig) {
    let schema = schema::Schema::new(
        schema::Queries,
        schema::Mutations,
        schema::Subscriptions::new(),
    );
    cfg.service(
        actix_web::web::scope(routes::paths::GRAPHQL)
            .data(schema)
            .route("", actix_web::web::post().to(routes::handlers::graphql))
            .route("", actix_web::web::get().to(routes::handlers::graphql)),
    );
}
