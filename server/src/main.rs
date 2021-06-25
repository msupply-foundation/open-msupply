#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "info");
    env_logger::init();

    let configuration = remote_server::util::configuration::get_configuration()
        .expect("Failed to parse configuration settings");

    let listener = std::net::TcpListener::bind(configuration.server.address())
        .expect("Failed to bind server to address");

    let pool = sqlx::PgPool::connect(&configuration.database.connection_string())
        .await
        .expect("Failed to connect to omsupply-database");

    let database = remote_server::database::connection::DatabaseConnection::new(pool).await;

    // TODO: replace mock data with tests
    database
        .insert_mock_data()
        .await
        .expect("Failed to insert mock data");

    remote_server::run(listener, database)?.await
}
