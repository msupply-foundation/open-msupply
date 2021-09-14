#![allow(where_clauses_object_safety)]

use remote_server::{
    database::{loader::get_loaders, repository::get_repositories},
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
use std::{
    env,
    net::TcpListener,
    sync::{Arc, Mutex},
    time::Duration,
};

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

    let repository_registry_sync_data = repository_registry_data.clone();

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
          sync_receiver.listen(repository_registry_sync_data).await;
        } => unreachable!("Sync scheduler unexpectedly died!?"),
    }
}
