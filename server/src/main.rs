#![allow(where_clauses_object_safety)]

#[cfg(not(feature = "mock"))]
use sqlx::PgPool;

#[cfg(feature = "mock")]
use {
    remote_server::database::{
        mock,
        schema::{
            DatabaseRow, ItemLineRow, ItemRow, NameRow, RequisitionLineRow, RequisitionRow,
            StoreRow, TransactLineRow, TransactRow, UserAccountRow,
        },
    },
    std::{collections::HashMap, sync::Mutex},
};

use remote_server::{
    database::repository::{
        CustomerInvoiceRepository, ItemLineRepository, ItemRepository, NameRepository,
        RequisitionLineRepository, RequisitionRepository, StoreRepository, TransactLineRepository,
        TransactRepository, UserAccountRepository,
    },
    server::{
        self,
        data::{RepositoryMap, RepositoryRegistry},
    },
    util::{configuration, settings::Settings},
};

use log::info;
use tokio::sync::mpsc::channel;
use tokio::sync::mpsc::error::TrySendError;
use tokio::time::{delay_for, interval, Duration};

use std::sync::Arc;
#[cfg(not(feature = "mock"))]
async fn get_repositories(settings: &Settings) -> RepositoryMap {
    let pool: PgPool = PgPool::connect(&settings.database.connection_string())
        .await
        .expect("Failed to connect to database");

    let mut repositories: RepositoryMap = RepositoryMap::new();

    repositories.insert(CustomerInvoiceRepository::new(pool.clone()));
    repositories.insert(ItemRepository::new(pool.clone()));
    repositories.insert(ItemLineRepository::new(pool.clone()));
    repositories.insert(NameRepository::new(pool.clone()));
    repositories.insert(RequisitionRepository::new(pool.clone()));
    repositories.insert(RequisitionLineRepository::new(pool.clone()));
    repositories.insert(StoreRepository::new(pool.clone()));
    repositories.insert(TransactRepository::new(pool.clone()));
    repositories.insert(TransactLineRepository::new(pool.clone()));
    repositories.insert(UserAccountRepository::new(pool.clone()));

    repositories
}

#[cfg(feature = "mock")]
pub fn get_repositories() -> RepositoryMap {
    let mut mock_data: HashMap<String, DatabaseRow> = HashMap::new();

    let mock_names: Vec<NameRow> = mock::mock_names();
    for name in mock_names {
        mock_data.insert(name.id.to_string(), DatabaseRow::Name(name.clone()));
    }

    let mock_items: Vec<ItemRow> = mock::mock_items();
    for item in mock_items {
        mock_data.insert(item.id.to_string(), DatabaseRow::Item(item.clone()));
    }

    let mock_item_lines: Vec<ItemLineRow> = mock::mock_item_lines();
    for item_line in mock_item_lines {
        mock_data.insert(
            item_line.id.to_string(),
            DatabaseRow::ItemLine(item_line.clone()),
        );
    }

    let mock_requisitions: Vec<RequisitionRow> = mock::mock_requisitions();
    for requisition in mock_requisitions {
        mock_data.insert(
            requisition.id.to_string(),
            DatabaseRow::Requisition(requisition.clone()),
        );
    }

    let mock_requisition_lines: Vec<RequisitionLineRow> = mock::mock_requisition_lines();
    for requisition_line in mock_requisition_lines {
        mock_data.insert(
            requisition_line.id.to_string(),
            DatabaseRow::RequisitionLine(requisition_line.clone()),
        );
    }

    let mock_stores: Vec<StoreRow> = mock::mock_stores();
    for store in mock_stores {
        mock_data.insert(store.id.to_string(), DatabaseRow::Store(store.clone()));
    }

    let mock_transacts: Vec<TransactRow> = mock::mock_transacts();
    for transact in mock_transacts {
        mock_data.insert(
            transact.id.to_string(),
            DatabaseRow::Transact(transact.clone()),
        );
    }

    let mock_transact_lines: Vec<TransactLineRow> = mock::mock_transact_lines();
    for transact_line in mock_transact_lines {
        mock_data.insert(
            transact_line.id.to_string(),
            DatabaseRow::TransactLine(transact_line.clone()),
        );
    }

    let mock_user_accounts: Vec<UserAccountRow> = mock::mock_user_accounts();
    for user_account in mock_user_accounts {
        mock_data.insert(
            user_account.id.to_string(),
            DatabaseRow::UserAccount(user_account.clone()),
        );
    }

    let mut repositories: RepositoryMap = RepositoryMap::new();
    let mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>> = Arc::new(Mutex::new(mock_data));

    repositories.insert(CustomerInvoiceRepository::new(Arc::clone(&mock_data)));
    repositories.insert(ItemRepository::new(Arc::clone(&mock_data)));
    repositories.insert(ItemLineRepository::new(Arc::clone(&mock_data)));
    repositories.insert(NameRepository::new(Arc::clone(&mock_data)));
    repositories.insert(RequisitionRepository::new(Arc::clone(&mock_data)));
    repositories.insert(RequisitionLineRepository::new(Arc::clone(&mock_data)));
    repositories.insert(StoreRepository::new(Arc::clone(&mock_data)));
    repositories.insert(TransactRepository::new(Arc::clone(&mock_data)));
    repositories.insert(TransactLineRepository::new(Arc::clone(&mock_data)));
    repositories.insert(UserAccountRepository::new(Arc::clone(&mock_data)));

    repositories
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    std::env::set_var("RUST_LOG", "info");
    env_logger::init();

    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");

    #[cfg(not(feature = "mock"))]
    let repositories: RepositoryMap = get_repositories(&settings).await;

    #[cfg(feature = "mock")]
    let repositories: RepositoryMap = get_repositories();

    let mut repositories = anymap::Map::new();
    repositories.insert(database::repository::CustomerInvoiceRepository::new(
        pool.clone(),
    ));
    repositories.insert(database::repository::ItemRepository::new(pool.clone()));
    repositories.insert(database::repository::ItemLineRepository::new(pool.clone()));
    repositories.insert(database::repository::NameRepository::new(pool.clone()));
    repositories.insert(database::repository::RequisitionRepository::new(
        pool.clone(),
    ));
    repositories.insert(database::repository::RequisitionLineRepository::new(
        pool.clone(),
    ));
    repositories.insert(database::repository::StoreRepository::new(pool.clone()));
    repositories.insert(database::repository::TransactRepository::new(pool.clone()));
    repositories.insert(database::repository::TransactLineRepository::new(
        pool.clone(),
    ));
    repositories.insert(database::repository::UserAccountRepository::new(
        pool.clone(),
    ));

    // We use a single-element channel so that we can only have one sync pending at a time.
    // We consume this at the *start* of sync, so we could schedule a sync while syncing.
    // Worst-case scenario, we produce an infinite stream of sync instructions and always go
    // straight from one sync to the next, but that’s OK.
    let (mut sync_sender, mut sync_receiver) = channel(1);

    let registry = RepositoryRegistry {
        repositories,
        // Arc and Mutex are both unfortunate requirements here because we need to mutate the
        // Sender later which the extractor doesn’t help us with, but all up it’s not a big deal.
        // Should be possible to remove them both later.
        sync_sender: Arc::new(std::sync::Mutex::new(sync_sender.clone())),
    };

    let listener = std::net::TcpListener::bind(configuration.server.address())
        .expect("Failed to bind server to address");

    let registry = actix_web::web::Data::new(registry);
    let http_server = actix_web::HttpServer::new(move || {
        actix_web::App::new()
            .app_data(registry.clone())
            .wrap(server::middleware::logger())
            .wrap(server::middleware::compress())
            .configure(server::service::graphql::config(registry.clone()))
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
