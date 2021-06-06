//! src/main.rs

mod database;
mod server;
mod utils;

use std::{env, io};
use std::net::TcpListener;

#[actix_web::main]
async fn main() -> io::Result<()> {
    env::set_var("RUST_LOG", "info");
    env_logger::init();

    let listener =
        TcpListener::bind("127.0.0.1:8080").expect("Failed to bind server to address");

    let database = database::DatabaseConnection::new(
        sqlx::PgPool::connect("postgres://postgres:password@localhost/omsupply-database")
            .await
            .expect("Failed to connect to omsupply-database"),
    )
    .await;

    // TODO: replace mock data with tests
    database
        .create_requisitions(utils::mock::mock_requisitions())
        .await
        .expect("Failed to insert mock requisition data");

    database
        .create_requisition_lines(utils::mock::mock_requisition_lines())
        .await
        .expect("Failed to insert mock requisition line data");

    server::run(listener, database)?.await
}
