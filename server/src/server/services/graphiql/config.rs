use crate::server::services::graphiql::routes::{handlers, paths};

pub fn config(cfg: &mut actix_web::web::ServiceConfig) {
    cfg.service(
        actix_web::web::scope(paths::GRAPHIQL)
            .route("", actix_web::web::get().to(handlers::graphiql)),
    );
}
