pub mod routes;

pub fn config(cfg: &mut actix_web::web::ServiceConfig) {
    cfg.service(
        actix_web::web::scope(routes::paths::GRAPHIQL)
            .route("", actix_web::web::get().to(routes::handlers::graphiql)),
    );
}
