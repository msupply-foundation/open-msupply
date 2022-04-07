use crate::static_files::config_static_files;

use self::{
    middleware::{compress as compress_middleware, logger as logger_middleware},
    settings::Settings,
    sync::Synchroniser,
};
use graphql_core::loader::{get_loaders, LoaderRegistry};
use openssl::ssl::{SslAcceptor, SslAcceptorBuilder, SslFiletype, SslMethod};

use graphql::config as graphql_config;
use log::{error, info, warn};
use repository::{get_storage_connection_manager, run_db_migrations};
use service::{auth_data::AuthData, service_provider::ServiceProvider, token_bucket::TokenBucket};

use actix_cors::Cors;
use actix_web::{web::Data, App, HttpServer};
use std::{io::ErrorKind, net::TcpListener, path::Path, sync::RwLock};
use tokio::sync::oneshot;

pub mod configuration;
pub mod environment;
pub mod middleware;
pub mod settings;
pub mod static_files;
pub mod sync;
pub mod test_utils;

/// Starts the server
///
/// This method doesn't return until a message is send to the off_switch.
pub async fn start_server(
    settings: Settings,
    mut off_switch: oneshot::Receiver<()>,
) -> std::io::Result<()> {
    let cert_type = find_certs();

    let auth_data = Data::new(AuthData {
        auth_token_secret: settings.auth.token_secret.to_owned(),
        token_bucket: RwLock::new(TokenBucket::new()),
        debug_no_ssl: settings.server.develop && matches!(cert_type, ServerCertType::None),
        debug_no_access_control: settings.server.develop && settings.server.debug_no_access_control,
    });

    let connection_manager = get_storage_connection_manager(&settings.database);

    info!("Run DB migrations...");
    match run_db_migrations(&connection_manager.connection().unwrap()) {
        Ok(_) => info!("DB migrations succeeded"),
        Err(err) => {
            let msg = format!("Failed to run DB migrations: {}", err);
            error!("{}", msg);
            panic!("{}", msg);
        }
    };

    let connection_manager_data_app = Data::new(connection_manager.clone());

    let service_provider = ServiceProvider::new(connection_manager.clone());
    let service_provider_data = Data::new(service_provider);

    let loaders = get_loaders(&connection_manager, service_provider_data.clone()).await;
    let loader_registry_data = Data::new(LoaderRegistry { loaders });

    let sync_settings_data = Data::new(settings.sync.clone());

    let mut http_server = HttpServer::new(move || {
        App::new()
            .wrap(logger_middleware())
            .wrap(Cors::permissive())
            .wrap(compress_middleware())
            .configure(graphql_config(
                connection_manager_data_app.clone(),
                loader_registry_data.clone(),
                service_provider_data.clone(),
                auth_data.clone(),
                sync_settings_data.clone(),
            ))
            .configure(config_static_files)
    });
    match cert_type {
        ServerCertType::SelfSigned(cert_path) => {
            let ssl_builder = load_certs(cert_path).expect("Invalid self signed certificates");
            http_server = http_server.bind_openssl(
                format!("{}:{}", settings.server.host, settings.server.port),
                ssl_builder,
            )?;
        }
        ServerCertType::None => {
            if !settings.server.develop {
                error!("No certificates found");
                return Err(std::io::Error::new(
                    ErrorKind::Other,
                    "Certificate required in production",
                ));
            } else {
                warn!("No certificates found: Run in HTTP development mode");
            }

            let listener = TcpListener::bind(settings.server.address())
                .expect("Failed to bind server to address");
            http_server = http_server.listen(listener)?;
        }
    }
    let mut running_sever = http_server.run();
    let mut synchroniser = Synchroniser::new(settings.sync, connection_manager).unwrap();
    // Do the initial pull before doing anything else
    match synchroniser.initial_pull().await {
        Ok(_) => {}
        Err(err) => {
            error!("Failed to perform the initial sync: {}", err);
            if !settings.server.develop {
                return Err(std::io::Error::new(
                    ErrorKind::Other,
                    "Initial sync must succeed in production",
                ));
            }
        }
    };

    // http_server is the only one that should quit; a proper shutdown signal can cause this,
    // and so we want an orderly exit. This achieves it nicely.
    let result = tokio::select! {
        result = (&mut running_sever) => result,
        _ = (&mut off_switch) => Ok(running_sever.handle().stop(true).await),
        () = async {
            synchroniser.run().await;
        } => unreachable!("Synchroniser unexpectedly died!?"),
    };

    info!("Remote server stopped");
    result
}

pub struct SelfSignedCertFiles {
    pub private_cert_file: String,
    pub public_cert_file: String,
}

/// Details about the certs used by the running server
pub enum ServerCertType {
    None,
    SelfSigned(SelfSignedCertFiles),
}

const PRIVATE_CERT_FILE: &str = "./certs/key.pem";
const PUBLIC_CERT_FILE: &str = "./certs/cert.pem";
fn find_certs() -> ServerCertType {
    if !Path::new(PRIVATE_CERT_FILE).exists() || !Path::new(PUBLIC_CERT_FILE).exists() {
        return ServerCertType::None;
    }
    return ServerCertType::SelfSigned(SelfSignedCertFiles {
        private_cert_file: PRIVATE_CERT_FILE.to_string(),
        public_cert_file: PUBLIC_CERT_FILE.to_string(),
    });
}

fn load_certs(cert_files: SelfSignedCertFiles) -> Result<SslAcceptorBuilder, anyhow::Error> {
    let mut builder = SslAcceptor::mozilla_intermediate(SslMethod::tls()).unwrap();
    builder.set_private_key_file(cert_files.private_cert_file, SslFiletype::PEM)?;
    builder.set_certificate_chain_file(cert_files.public_cert_file)?;
    Ok(builder)
}
