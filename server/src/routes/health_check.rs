//! src/routes/health_check.rs
use actix_web::HttpResponse;

pub async fn health_check() -> HttpResponse {
    HttpResponse::Ok().finish()
}
