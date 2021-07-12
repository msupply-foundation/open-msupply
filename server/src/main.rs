#![cfg_attr(feature = "mock", allow(unused_imports))]

use remote_server::database;
use remote_server::server;
use remote_server::util;

use log::info;
use tokio::sync::mpsc::channel;
use tokio::sync::mpsc::error::TrySendError;
use tokio::time::{delay_for, interval, Duration};

use std::sync::Arc;

#[cfg(feature = "mock")]
fn main() -> Result<(), &'static str> {
    Err("Compiled with the mock feature enabled, server not supported in this mode")
}

#[cfg(not(feature = "mock"))]
#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "info");
    env_logger::init();

    let configuration =
        util::configuration::get_configuration().expect("Failed to parse configuration settings");

    let pool: sqlx::PgPool = sqlx::PgPool::connect(&configuration.database.connection_string())
        .await
        .expect("Failed to connect to database");

    let customer_invoice_repository = Arc::new(
        database::repository::CustomerInvoiceRepository::new(pool.clone()),
    );

    let item_repository = Arc::new(database::repository::ItemRepository::new(pool.clone()));

    let item_line_repository =
        Arc::new(database::repository::ItemLineRepository::new(pool.clone()));

    let name_repository = Arc::new(database::repository::NameRepository::new(pool.clone()));

    let requisition_repository = Arc::new(database::repository::RequisitionRepository::new(
        pool.clone(),
    ));

    let requisition_line_repository = Arc::new(
        database::repository::RequisitionLineRepository::new(pool.clone()),
    );

    let store_repository = Arc::new(database::repository::StoreRepository::new(pool.clone()));

    let transact_repository = Arc::new(database::repository::TransactRepository::new(pool.clone()));

    let transact_line_repository = Arc::new(database::repository::TransactLineRepository::new(
        pool.clone(),
    ));

    let user_account_repository = Arc::new(database::repository::UserAccountRepository::new(
        pool.clone(),
    ));

    // We use a single-element channel so that we can only have one sync pending at a time.
    // We consume this at the *start* of sync, so we could schedule a sync while syncing.
    // Worst-case scenario, we produce an infinite stream of sync instructions and always go
    // straight from one sync to the next, but that’s OK.
    let (mut sync_sender, mut sync_receiver) = channel(1);

    let registry = server::data::RepositoryRegistry {
        customer_invoice_repository: Some(customer_invoice_repository),
        item_repository: Some(item_repository),
        item_line_repository: Some(item_line_repository),
        name_repository: Some(name_repository),
        requisition_repository: Some(requisition_repository),
        requisition_line_repository: Some(requisition_line_repository),
        store_repository: Some(store_repository),
        transact_repository: Some(transact_repository),
        transact_line_repository: Some(transact_line_repository),
        user_account_repository: Some(user_account_repository),
        // Arc and Mutex are both unfortunate requirements here because we need to mutate the
        // Sender later which the extractor doesn’t help us with, but all up it’s not a big deal.
        // Should be possible to remove them both later.
        sync_sender: Arc::new(std::sync::Mutex::new(sync_sender.clone())),
    };

    let listener = std::net::TcpListener::bind(configuration.server.address())
        .expect("Failed to bind server to address");

    let http_server = actix_web::HttpServer::new(move || {
        actix_web::App::new()
            .data(registry.clone())
            .wrap(server::middleware::logger())
            .wrap(server::middleware::compress())
            .configure(server::service::graphiql::config)
            .configure(server::service::graphql::config)
            .configure(server::service::rest::config)
    })
    .listen(listener)?
    .run();

    let scheduler = async {
        let mut interval = interval(Duration::from_secs(10));
        loop {
            interval.tick().await;
            info!(target: "scheduler", "10 seconds have passed since last tick, scheduling sync");
            // This implementation is purely tick-based, not taking into account how long sync
            // takes, whether manual sync has been triggered and so the schedule should be
            // adjusted, whether it failed and should be tried again sooner, &c. If you want to
            // take any of these into account, create another channel from sync → scheduler.
            match sync_sender.try_send(()) {
                Ok(()) => info!(target: "scheduler", "sync successfully scheduled"),
                Err(TrySendError::Full(())) => info!(target: "scheduler", "sync already pending"),
                Err(TrySendError::Closed(())) => unreachable!("sync died!?"),
            }
        }
    };

    let sync = async {
        while let Some(()) = sync_receiver.recv().await {
            info!(target: "sync", "Someone requested a sync, pretending to do it…");
            delay_for(Duration::from_secs(2)).await;
            info!(target: "sync", "Done!");
        }
        unreachable!("sync channel senders all died!?");
    };

    // http_server is the only one that should quit; a proper shutdown signal can cause this,
    // and so we want an orderly exit. This achieves it nicely.
    tokio::select! {
        result = http_server => result,
        () = sync => unreachable!("sync is not supposed to finish"),
        () = scheduler => unreachable!("scheduler is not supposed to finish"),
    }
}
