pub mod routes;

pub fn config(cfg: &mut actix_web::web::ServiceConfig) {
    cfg.service(actix_web::web::scope("/").route(
        routes::paths::HEALTH_CHECK,
        actix_web::web::get().to(routes::handlers::health_check),
    ).route(
        routes::paths::SCHEDULE_SYNC,
        actix_web::web::get().to(routes::handlers::schedule_sync),
    ));
}
