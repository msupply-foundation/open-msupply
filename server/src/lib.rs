pub mod database;
pub mod server;
pub mod util;

pub fn run(
    listener: std::net::TcpListener,
    database: database::connection::DatabaseConnection,
) -> Result<actix_web::dev::Server, std::io::Error> {
    Ok(actix_web::HttpServer::new(move || {
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
    .run())
}
