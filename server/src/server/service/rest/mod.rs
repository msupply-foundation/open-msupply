use actix_web::{
    web::{get, scope, Data, ServiceConfig},
    HttpRequest, HttpResponse, Result,
};

pub fn config(cfg: &mut ServiceConfig) {
    cfg.service(
        scope("/")
            .route("/health_check", get().to(health_check))
            .route("/schedule_sync", get().to(schedule_sync)),
    );
}

async fn health_check(_req: HttpRequest) -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().finish())
}

async fn schedule_sync(
    registry: Data<crate::server::data::RepositoryRegistry>,
) -> Result<HttpResponse> {
    registry.sync_sender.lock().unwrap().send();
    Ok(HttpResponse::Ok().body(""))
}
