#![allow(where_clauses_object_safety)]

use openssl::ssl::{SslAcceptor, SslAcceptorBuilder, SslFiletype, SslMethod};
use server::{
    actor_registry::ActorRegistry,
    configuration,
    middleware::{compress as compress_middleware, logger as logger_middleware},
    settings::Settings,
    sync::{self, SyncConnection, SyncReceiverActor, SyncSenderActor, Synchroniser},
};

use graphql::{
    config as graphql_config,
    loader::{get_loaders, LoaderMap, LoaderRegistry},
};
use log::{error, warn};
use repository::get_storage_connection_manager;
use service::{auth_data::AuthData, service_provider::ServiceProvider, token_bucket::TokenBucket};

use actix_cors::Cors;
use actix_web::{web::Data, App, HttpServer};
use std::{
    env,
    net::TcpListener,
    sync::{Arc, Mutex, RwLock},
    time::Duration,
};

fn load_certs() -> Result<SslAcceptorBuilder, anyhow::Error> {
    let mut builder = SslAcceptor::mozilla_intermediate(SslMethod::tls()).unwrap();
    builder.set_private_key_file("certs/key.pem", SslFiletype::PEM)?;
    builder.set_certificate_chain_file("certs/cert.pem")?;
    Ok(builder)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    env::set_var("RUST_LOG", "info");
    env_logger::init();

    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");

    let auth_data = Data::new(AuthData {
        auth_token_secret: settings.auth.token_secret.to_owned(),
        token_bucket: RwLock::new(TokenBucket::new()),
        // TODO: configure ssl
        debug_no_ssl: true,
        debug_no_access_control: false,
    });
    let connection_manager = get_storage_connection_manager(&settings.database);
    let loaders: LoaderMap = get_loaders(&connection_manager).await;
    let service_provider = ServiceProvider::new(connection_manager.clone());
    let (mut sync_sender, mut sync_receiver): (SyncSenderActor, SyncReceiverActor) =
        sync::get_sync_actors();

    let actor_registry = ActorRegistry {
        sync_sender: Arc::new(Mutex::new(sync_sender.clone())),
    };

    let connection_manager_data_app = Data::new(connection_manager);
    let connection_manager_data_sync = connection_manager_data_app.clone();
    let loader_registry_data = Data::new(LoaderRegistry { loaders });
    let service_provider_data = Data::new(service_provider);
    let actor_registry_data = Data::new(actor_registry);

    let mut http_server = HttpServer::new(move || {
        App::new()
            .app_data(connection_manager_data_app.clone())
            .app_data(actor_registry_data.clone())
            .wrap(logger_middleware())
            .wrap(Cors::permissive())
            .wrap(compress_middleware())
            .configure(graphql_config(
                connection_manager_data_app.clone(),
                loader_registry_data.clone(),
                service_provider_data.clone(),
                auth_data.clone(),
            ))
    });
    match load_certs() {
        Ok(ssl_builder) => {
            http_server = http_server.bind_openssl(
                format!("{}:{}", settings.server.host, settings.server.port),
                ssl_builder,
            )?;
        }
        Err(err) => {
            error!("Failed to load certificates: {}", err);
            warn!("Run in HTTP mode");

            let listener = TcpListener::bind(settings.server.address())
                .expect("Failed to bind server to address");
            http_server = http_server.listen(listener)?;
        }
    }
    let running_sever = http_server.run();

    let connection = SyncConnection::new(&settings.sync);
    let mut synchroniser = Synchroniser { connection };

    // http_server is the only one that should quit; a proper shutdown signal can cause this,
    // and so we want an orderly exit. This achieves it nicely.
    tokio::select! {
        result = running_sever => result,
        () = async {
          sync_sender.schedule_send(Duration::from_secs(settings.sync.interval)).await;
        } => unreachable!("Sync receiver unexpectedly died!?"),
        () = async {
            sync_receiver.listen(&mut synchroniser, &connection_manager_data_sync).await;
        } => unreachable!("Sync scheduler unexpectedly died!?"),
    }
}
