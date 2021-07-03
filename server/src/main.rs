use remote_server::database;
use remote_server::server;
use remote_server::util;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "info");
    env_logger::init();

    let configuration =
        util::configuration::get_configuration().expect("Failed to parse configuration settings");

    let pool: sqlx::PgPool = sqlx::PgPool::connect(&configuration.database.connection_string())
        .await
        .expect("Failed to connect to database");

    let customer_invoice_repository =
        database::repository::CustomerInvoiceRepository::new(pool.clone());
    let item_repository = database::repository::ItemRepository::new(pool.clone());
    let item_line_repository = database::repository::ItemLineRepository::new(pool.clone());
    let name_repository = database::repository::NameRepository::new(pool.clone());
    let requisition_repository = database::repository::RequisitionRepository::new(pool.clone());
    let requisition_line_repository =
        database::repository::RequisitionLineRepository::new(pool.clone());
    let store_repository = database::repository::StoreRepository::new(pool.clone());
    let transact_repository = database::repository::TransactRepository::new(pool.clone());
    let transact_line_repository = database::repository::TransactLineRepository::new(pool.clone());
    let user_account_repository = database::repository::UserAccountRepository::new(pool.clone());

    let registry = server::data::Registry {
        customer_invoice_repository,
        item_repository,
        item_line_repository,
        name_repository,
        requisition_repository,
        requisition_line_repository,
        store_repository,
        transact_repository,
        transact_line_repository,
        user_account_repository,
    };

    let listener = std::net::TcpListener::bind(configuration.server.address())
        .expect("Failed to bind server to address");

    actix_web::HttpServer::new(move || {
        actix_web::App::new()
            .data(registry.clone())
            .wrap(server::middleware::logger())
            .wrap(server::middleware::compress())
            .wrap(server::middleware::cors())
            .configure(server::service::graphiql::config)
            .configure(server::service::graphql::config)
            .configure(server::service::rest::config)
    })
    .listen(listener)?
    .run()
    .await
}
