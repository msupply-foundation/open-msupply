#![allow(where_clauses_object_safety)]

use actix_cors::Cors;
use remote_server::{
    database::{loader::get_loaders, repository::get_repositories},
    server::{
        data::{
            auth::AuthData, ActorRegistry, LoaderMap, LoaderRegistry, RepositoryMap,
            RepositoryRegistry,
        },
        middleware::{compress as compress_middleware, logger as logger_middleware},
        service::{graphql::config as graphql_config, rest::config as rest_config},
    },
    service::token_bucket::TokenBucket,
    util::{
        configuration,
        settings::Settings,
        sync::{self, SyncConnection, SyncReceiverActor, SyncSenderActor, Synchroniser},
    },
};

use actix_web::{web::Data, App, HttpServer};
use std::{
    env,
    net::TcpListener,
    sync::{Arc, Mutex, RwLock},
    time::Duration,
};

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env::set_var("RUST_LOG", "info");
    env_logger::init();

    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");

    let auth_data = Data::new(AuthData {
        auth_token_secret: "TODO: get secret from somewhere else, e.g. DB table?".to_string(),
        token_bucket: RwLock::new(TokenBucket::new()),
        // TODO: configure ssl
        debug_no_ssl: true,
    });
    let repositories: RepositoryMap = get_repositories(&settings).await;
    let loaders: LoaderMap = get_loaders(&settings).await;
    let (mut sync_sender, mut sync_receiver): (SyncSenderActor, SyncReceiverActor) =
        sync::get_sync_actors();

    let repository_registry = RepositoryRegistry { repositories };
    let loader_registry = LoaderRegistry { loaders };
    let actor_registry = ActorRegistry {
        sync_sender: Arc::new(Mutex::new(sync_sender.clone())),
    };

    let repository_registry_data_app = Data::new(repository_registry);
    let repository_registry_data_sync = repository_registry_data_app.clone();

    let loader_registry_data = Data::new(loader_registry);
    let actor_registry_data = Data::new(actor_registry);

    let listener =
        TcpListener::bind(settings.server.address()).expect("Failed to bind server to address");

    let http_server = HttpServer::new(move || {
        App::new()
            .app_data(repository_registry_data_app.clone())
            .app_data(actor_registry_data.clone())
            .app_data(auth_data.clone())
            .wrap(logger_middleware())
            .wrap(Cors::permissive())
            .wrap(compress_middleware())
            .configure(graphql_config(
                repository_registry_data_app.clone(),
                loader_registry_data.clone(),
            ))
            .configure(rest_config)
    })
    .listen(listener)?
    .run();

    let connection = SyncConnection::new(&settings.sync);
    let mut synchroniser = Synchroniser { connection };

    // http_server is the only one that should quit; a proper shutdown signal can cause this,
    // and so we want an orderly exit. This achieves it nicely.
    tokio::select! {
        result = http_server => result,
        () = async {
          sync_sender.schedule_send(Duration::from_secs(settings.sync.interval)).await;
        } => unreachable!("Sync receiver unexpectedly died!?"),
        () = async {
            sync_receiver.listen(&mut synchroniser, &repository_registry_data_sync).await;
        } => unreachable!("Sync scheduler unexpectedly died!?"),
    }
}
