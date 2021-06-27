use remote_server::database;
use remote_server::util;
use remote_server::server;


#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "info");
    env_logger::init();

    let configuration = util::configuration::get_configuration()
        .expect("Failed to parse configuration settings");

    let listener = std::net::TcpListener::bind(configuration.server.address())
        .expect("Failed to bind server to address");

    let database = database::connection::DatabaseConnection::new(
        &configuration.database.connection_string(),
    ).await;

    // TODO: replace mock data with tests
    database
        .insert_mock_data()
        .await
        .expect("Failed to insert mock data");

    actix_web::HttpServer::new(move || {
        actix_web::App::new()
            .data(database.clone())
            .wrap(server::middleware::logger())
            .wrap(server::middleware::compress())
            .wrap(server::middleware::cors())
            .configure(server::services::graphiql::config)
            .configure(server::services::graphql::config)
            .configure(server::services::rest::config)
    })
    .listen(listener)?
    .run()
    .await
}
