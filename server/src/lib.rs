//! src/lib.rs

use actix_web::dev::Server;
use actix_web::{web, App, HttpResponse, HttpServer};

use std::net::TcpListener;

#[derive(serde::Deserialize)]
struct RequisitionData {
    id: String,
    from: String,
    to: String
}

async fn health_check() -> HttpResponse {
    HttpResponse::Ok().finish()
}

async fn post_requisition(_requisition_data: web::Form<RequisitionData>) -> HttpResponse {
    HttpResponse::Ok().finish()
}

pub fn run(listener: TcpListener) -> Result<Server, std::io::Error> {
    let server = HttpServer::new(|| {
        App::new()
            .route("/health_check", web::get().to(health_check))
            .route("/requisition", web::post().to(post_requisition))
    })
    .listen(listener)?
    .run();
    Ok(server)
}
