use actix_web::{HttpRequest, HttpResponse, Result, web::{Data, ServiceConfig, scope, get}};
use tokio::sync::mpsc::error::TrySendError;

pub fn config(cfg: &mut ServiceConfig) {
    cfg.service(
        scope("/")
            .route(
                "/health_check",
                get().to(health_check),
            )
            .route(
                "/schedule_sync",
                get().to(schedule_sync),
            ),
    );
}

async fn health_check(
    _req: HttpRequest,
) -> Result<HttpResponse> {
    Ok(HttpResponse::Ok().finish())
}

async fn schedule_sync(
    registry: Data<crate::server::data::RepositoryRegistry>,
) -> Result<HttpResponse> {
    Ok(match registry.sync_sender.lock().unwrap().try_send(()) {
        Ok(()) => HttpResponse::Ok().body("sync scheduled"),
        Err(TrySendError::Full(())) => HttpResponse::Ok().body("sync already pending"),
        Err(TrySendError::Closed(())) => {
            HttpResponse::InternalServerError().body("sync died!?")
        }
    })
}
