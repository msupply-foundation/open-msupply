//! src/main.rs

mod services;
mod utils;

use utils::database::DatabaseConnection;

use actix_cors::Cors;
use actix_web::{http::header, middleware, App, HttpServer};

use sqlx::PgPool;
use std::env;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env::set_var("RUST_LOG", "info");
    env_logger::init();

    let database = DatabaseConnection::new_with_data(
        PgPool::connect("postgres://postgres:password@localhost/omsupply-DatabaseConnection")
            .await
            .expect("Failed to connect to DatabaseConnection"),
    )
    .await;

    let server = HttpServer::new(move || {
        App::new()
            .data(database.clone())
            .wrap(middleware::Compress::default())
            .wrap(middleware::Logger::default())
            .wrap(
                Cors::default()
                    .allowed_origin("http://127.0.0.1:8080")
                    .allowed_methods(vec!["POST", "GET"])
                    .allowed_headers(vec![header::AUTHORIZATION, header::ACCEPT])
                    .allowed_header(header::CONTENT_TYPE)
                    .supports_credentials()
                    .max_age(3600),
            )
            .configure(services::graphql::config)
    });

    server
        .bind("127.0.0.1:8080")
        .expect("Failed to bind server to address")
        .run()
        .await
}
