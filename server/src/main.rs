mod database;
mod server;
mod utils;

use std::net::TcpListener;
use std::{env, io};

use utils::get_configuration;

#[actix_web::main]
async fn main() -> io::Result<()> {
    env::set_var("RUST_LOG", "info");
    env_logger::init();

    let configuration = get_configuration().expect("Failed to parse configuration settings");

    let listener = TcpListener::bind(configuration.server.address())
        .expect("Failed to bind server to address");

    let pool = sqlx::PgPool::connect(&configuration.database.connection_string())
        .await
        .expect("Failed to connect to omsupply-database");

    let database = database::DatabaseConnection::new(pool).await;

    // TODO: replace mock data with tests
    database
        .insert_mock_data()
        .await
        .expect("Failed to insert mock data");

    server::run(listener, database)?.await
}
