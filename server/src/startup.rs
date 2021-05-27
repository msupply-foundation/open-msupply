//! src/startup.rs
use crate::routes::{health_check, post_requisition};
use actix_web::dev::Server;
use actix_web::middleware::Logger;
use actix_web::{web, App, HttpServer};
use sqlx::PgPool;
use std::net::TcpListener;

pub fn run(listener: TcpListener, connection_pool: PgPool) -> Result<Server, std::io::Error> {
    let connection_pool = web::Data::new(connection_pool);
    let server = HttpServer::new(move || {
        App::new()
            .wrap(Logger::default())
            .route("/health_check", web::get().to(health_check))
            .route("/requisition", web::post().to(post_requisition))
            .app_data(connection_pool.clone())
    })
    .listen(listener)?
    .run();
    Ok(server)
}
