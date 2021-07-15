use actix_web::web::Data;
use tokio::sync::mpsc::error::TrySendError;

pub async fn health_check(
    _req: actix_web::HttpRequest,
) -> Result<actix_web::HttpResponse, actix_web::Error> {
    Ok(actix_web::HttpResponse::Ok().finish())
}

pub async fn schedule_sync(
    registry: Data<crate::server::data::RepositoryRegistry>,
) -> Result<actix_web::HttpResponse, actix_web::Error> {
    Ok(match registry.sync_sender.lock().unwrap().try_send(()) {
        Ok(()) => actix_web::HttpResponse::Ok().body("sync scheduled"),
        Err(TrySendError::Full(())) => actix_web::HttpResponse::Ok().body("sync already pending"),
        Err(TrySendError::Closed(())) => {
            actix_web::HttpResponse::InternalServerError().body("sync died!?")
        }
    })
}
