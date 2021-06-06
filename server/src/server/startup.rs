use crate::database::DatabaseConnection;
use crate::server::middleware;
use crate::server::services;

use actix_web::{App, HttpServer};
use actix_web::dev::Server;
use std::net::TcpListener;

pub fn run(
    listener: TcpListener,
    database: DatabaseConnection,
) -> Result<Server, std::io::Error> {
    Ok(HttpServer::new(move || {
        App::new()
            .data(database.clone())
            .wrap(middleware::compress())
            .wrap(middleware::logger())
            .wrap(middleware::cors())
            .configure(services::graphql::config)
            .configure(services::rest::config)
    })
    .listen(listener)?
    .run())
}
