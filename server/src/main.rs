use remote_server::database;
use remote_server::server;
use remote_server::util;

#[allow(unused_imports)]
use remote_server::database::repository::{MockRepository, PgSqlxRepository};

use std::collections::HashMap;
use std::sync::{Arc, Mutex};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "info");
    env_logger::init();

    let configuration =
        util::configuration::get_configuration().expect("Failed to parse configuration settings");

    // let pool: sqlx::PgPool = sqlx::PgPool::connect(&configuration.database.connection_string())
    //     .await
    //     .expect("Failed to connect to database");

    // let customer_invoice_repository = Arc::new(
    //     database::repository::CustomerInvoicePgSqlxRepository::new(pool.clone()),
    // );

    // let item_repository = Arc::new(database::repository::ItemPgSqlxRepository::new(
    //     pool.clone(),
    // ));

    // let item_line_repository = Arc::new(database::repository::ItemLinePgSqlxRepository::new(
    //     pool.clone(),
    // ));

    // let name_repository = Arc::new(database::repository::NamePgSqlxRepository::new(
    //     pool.clone(),
    // ));

    // let requisition_repository = Arc::new(database::repository::RequisitionPgSqlxRepository::new(
    //     pool.clone(),
    // ));

    // let requisition_line_repository = Arc::new(
    //     database::repository::RequisitionLinePgSqlxRepository::new(pool.clone()),
    // );

    // let store_repository = Arc::new(database::repository::StorePgSqlxRepository::new(
    //     pool.clone(),
    // ));

    // let transact_repository = Arc::new(database::repository::TransactPgSqlxRepository::new(
    //     pool.clone(),
    // ));

    // let transact_line_repository = Arc::new(
    //     database::repository::TransactLinePgSqlxRepository::new(pool.clone()),
    // );

    // let user_account_repository = Arc::new(database::repository::UserAccountPgSqlxRepository::new(
    //     pool.clone(),
    // ));

    let transact_repository_mock_data: Arc<Mutex<HashMap<String, database::schema::TransactRow>>> =
        Arc::new(Mutex::new(HashMap::new()));

    let customer_invoice_repository_mock_data: Arc<
        Mutex<HashMap<String, database::schema::TransactRow>>,
    > = Arc::clone(&transact_repository_mock_data);

    let transact_line_repository_mock_data: Arc<
        Mutex<HashMap<String, database::schema::TransactLineRow>>,
    > = Arc::new(Mutex::new(HashMap::new()));

    let item_repository_mock_data: Arc<Mutex<HashMap<String, database::schema::ItemRow>>> =
        Arc::new(Mutex::new(HashMap::new()));

    let item_line_repository_mock_data: Arc<Mutex<HashMap<String, database::schema::ItemLineRow>>> =
        Arc::new(Mutex::new(HashMap::new()));

    let name_repository_mock_data: Arc<Mutex<HashMap<String, database::schema::NameRow>>> =
        Arc::new(Mutex::new(HashMap::new()));

    let requisition_repository_mock_data: Arc<
        Mutex<HashMap<String, database::schema::RequisitionRow>>,
    > = Arc::new(Mutex::new(HashMap::new()));

    let requisition_line_repository_mock_data: Arc<
        Mutex<HashMap<String, database::schema::RequisitionLineRow>>,
    > = Arc::new(Mutex::new(HashMap::new()));

    let store_repository_mock_data: Arc<Mutex<HashMap<String, database::schema::StoreRow>>> =
        Arc::new(Mutex::new(HashMap::new()));

    let user_account_repository_mock_data: Arc<
        Mutex<HashMap<String, database::schema::UserAccountRow>>,
    > = Arc::new(Mutex::new(HashMap::new()));

    let customer_invoice_repository =
        Arc::new(database::repository::CustomerInvoiceMockRepository::new(
            customer_invoice_repository_mock_data,
        ));

    let item_repository = Arc::new(database::repository::ItemMockRepository::new(
        item_repository_mock_data,
    ));

    let item_line_repository = Arc::new(database::repository::ItemLineMockRepository::new(
        item_line_repository_mock_data,
    ));

    let name_repository = Arc::new(database::repository::NameMockRepository::new(
        name_repository_mock_data,
    ));

    let requisition_repository = Arc::new(database::repository::RequisitionMockRepository::new(
        requisition_repository_mock_data,
    ));

    let requisition_line_repository =
        Arc::new(database::repository::RequisitionLineMockRepository::new(
            requisition_line_repository_mock_data,
        ));

    let store_repository = Arc::new(database::repository::StoreMockRepository::new(
        store_repository_mock_data,
    ));

    let transact_repository = Arc::new(database::repository::TransactMockRepository::new(
        transact_repository_mock_data,
    ));

    let transact_line_repository = Arc::new(database::repository::TransactLineMockRepository::new(
        transact_line_repository_mock_data,
    ));

    let user_account_repository = Arc::new(database::repository::UserAccountMockRepository::new(
        user_account_repository_mock_data,
    ));

    let registry = server::data::RepositoryRegistry {
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
            .configure(server::service::graphiql::config)
            .configure(server::service::graphql::config)
            .configure(server::service::rest::config)
    })
    .listen(listener)?
    .run()
    .await
}
