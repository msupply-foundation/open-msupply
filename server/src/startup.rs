//! src/startup.rs
use crate::routes::{health_check, post_requisition};

use actix_web::dev::Server;
use actix_web::{web, App, HttpServer};

use std::net::TcpListener;

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
