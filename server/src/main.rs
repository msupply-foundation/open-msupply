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
    std::collections::HashMap,
};

use remote_server::{
    database::{
        loader::{
            ItemLineLoader, ItemLoader, NameLoader, RequisitionLineLoader, RequisitionLoader,
            StoreLoader,
        },
        repository::{
            CustomerInvoiceRepository, ItemLineRepository, ItemRepository, NameRepository,
            RequisitionLineRepository, RequisitionRepository, StoreRepository,
            TransactLineRepository, TransactRepository, UserAccountRepository,
        },
    },
    server::{
        data::{ActorRegistry, LoaderMap, LoaderRegistry, RepositoryMap, RepositoryRegistry},
        middleware::{compress as compress_middleware, logger as logger_middleware},
        service::{graphql::config as graphql_config, rest::config as rest_config},
    },
    util::{
        configuration,
        settings::Settings,
        sync::{self, SyncConnection, SyncReceiverActor, SyncSenderActor},
    },
};

use actix_web::{web::Data, App, HttpServer};

use async_graphql::dataloader::DataLoader;
use std::{
    env,
    net::TcpListener,
    sync::{Arc, Mutex},
    time::Duration,
};

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
async fn get_repositories(_: &Settings) -> RepositoryMap {
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

#[cfg(not(feature = "mock"))]
pub async fn get_loaders(settings: &Settings) -> LoaderMap {
    let pool: PgPool = PgPool::connect(&settings.database.connection_string())
        .await
        .expect("Failed to connect to database");

    let mut loaders: LoaderMap = LoaderMap::new();

    let item_repository = ItemRepository::new(pool.clone());
    let item_loader = DataLoader::new(ItemLoader { item_repository });

    let item_line_repository = ItemLineRepository::new(pool.clone());
    let item_line_loader = DataLoader::new(ItemLineLoader {
        item_line_repository,
    });

    let requisition_repository = RequisitionRepository::new(pool.clone());
    let requisition_loader = DataLoader::new(RequisitionLoader {
        requisition_repository,
    });

    let requisition_line_repository = RequisitionLineRepository::new(pool.clone());
    let requisition_line_loader = DataLoader::new(RequisitionLineLoader {
        requisition_line_repository,
    });

    let name_repository = NameRepository::new(pool.clone());
    let name_loader = DataLoader::new(NameLoader { name_repository });

    let store_repository = StoreRepository::new(pool.clone());
    let store_loader = DataLoader::new(StoreLoader { store_repository });

    loaders.insert(item_loader);
    loaders.insert(item_line_loader);
    loaders.insert(requisition_loader);
    loaders.insert(requisition_line_loader);
    loaders.insert(name_loader);
    loaders.insert(store_loader);

    loaders
}

#[cfg(feature = "mock")]
pub async fn get_loaders(_settings: &Settings) -> LoaderMap {
    let mut loaders = LoaderMap::new();

    let mut mock_data: HashMap<String, DatabaseRow> = HashMap::new();

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

    let mock_names: Vec<NameRow> = mock::mock_names();
    for name in mock_names {
        mock_data.insert(name.id.to_string(), DatabaseRow::Name(name.clone()));
    }

    let mock_stores: Vec<StoreRow> = mock::mock_stores();
    for store in mock_stores {
        mock_data.insert(store.id.to_string(), DatabaseRow::Store(store.clone()));
    }

    let mock_data: Arc<Mutex<HashMap<String, DatabaseRow>>> = Arc::new(Mutex::new(mock_data));

    let item_repository = ItemRepository::new(Arc::clone(&mock_data));
    let item_loader = DataLoader::new(ItemLoader { item_repository });

    let item_line_repository = ItemLineRepository::new(Arc::clone(&mock_data));
    let item_line_loader = DataLoader::new(ItemLineLoader {
        item_line_repository,
    });

    let requisition_repository = RequisitionRepository::new(Arc::clone(&mock_data));
    let requisition_loader = DataLoader::new(RequisitionLoader {
        requisition_repository,
    });

    let requisition_line_repository = RequisitionLineRepository::new(Arc::clone(&mock_data));
    let requisition_line_loader = DataLoader::new(RequisitionLineLoader {
        requisition_line_repository,
    });

    let name_repository = NameRepository::new(Arc::clone(&mock_data));
    let name_loader = DataLoader::new(NameLoader { name_repository });

    let store_repository = StoreRepository::new(Arc::clone(&mock_data));
    let store_loader = DataLoader::new(StoreLoader { store_repository });

    loaders.insert(item_loader);
    loaders.insert(item_line_loader);
    loaders.insert(requisition_loader);
    loaders.insert(requisition_line_loader);
    loaders.insert(name_loader);
    loaders.insert(store_loader);

    loaders
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env::set_var("RUST_LOG", "info");
    env_logger::init();

    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");

    let repositories: RepositoryMap = get_repositories(&settings).await;
    let loaders: LoaderMap = get_loaders(&settings).await;

    let sync_connection = SyncConnection::new(&settings.sync);
    let (mut sync_sender, mut sync_receiver): (SyncSenderActor, SyncReceiverActor) =
        sync::get_sync_actors(sync_connection);

    let repository_registry = RepositoryRegistry { repositories };
    let loader_registry = LoaderRegistry { loaders };
    let actor_registry = ActorRegistry {
        sync_sender: Arc::new(Mutex::new(sync_sender.clone())),
    };

    let repository_registry_data = Data::new(repository_registry);
    let loader_registry_data = Data::new(loader_registry);
    let actor_registry_data = Data::new(actor_registry);

    let listener =
        TcpListener::bind(settings.server.address()).expect("Failed to bind server to address");

    let http_server = HttpServer::new(move || {
        App::new()
            .app_data(repository_registry_data.clone())
            .app_data(actor_registry_data.clone())
            .wrap(logger_middleware())
            .wrap(compress_middleware())
            .configure(graphql_config(
                repository_registry_data.clone(),
                loader_registry_data.clone(),
            ))
            .configure(rest_config)
    })
    .listen(listener)?
    .run();

    // http_server is the only one that should quit; a proper shutdown signal can cause this,
    // and so we want an orderly exit. This achieves it nicely.
    tokio::select! {
        result = http_server => result,
        () = async {
          sync_sender.schedule_send(Duration::from_secs(settings.sync.interval)).await;
        } => unreachable!("Sync receiver unexpectedly died!?"),
        () = async {
          sync_receiver.listen().await;
        } => unreachable!("Sync scheduler unexpectedly died!?"),
    }
}
