//! src/startup.rs
use crate::routes::{health_check, post_requisition};

use actix_web::dev::Server;
use actix_web::{web, App, HttpServer};
use sqlx::{Connection, PgConnection};

use std::net::TcpListener;
use std::sync::Arc;

pub fn run(listener: TcpListener, connection: PgConnection) -> Result<Server, std::io::Error> {
    let connection = Arc::new(connection);
    let server = HttpServer::new(move || {
        App::new()
            .route("/health_check", web::get().to(health_check))
            .route("/requisition", web::post().to(post_requisition))
            .data(connection.clone())
    })
    .listen(listener)?
    .run();
    Ok(server)
}
