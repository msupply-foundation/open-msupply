use crate::static_files::config_static_files;

use self::{
    middleware::{compress as compress_middleware, logger as logger_middleware},
    settings::Settings,
    sync::Synchroniser,
};
use graphql_core::loader::{get_loaders, LoaderRegistry};
use openssl::ssl::{SslAcceptor, SslAcceptorBuilder, SslFiletype, SslMethod};

use graphql::{config as graphql_config, config_stage0};
use log::{error, info, warn};
use repository::{get_storage_connection_manager, run_db_migrations, StorageConnectionManager};
use service::{
    auth_data::AuthData,
    service_provider::ServiceProvider,
    settings_service::{SettingsService, SettingsServiceTrait},
    token_bucket::TokenBucket,
};

use actix_cors::Cors;
use actix_web::{web::Data, App, HttpServer};
use std::{
    io::ErrorKind,
    net::TcpListener,
    ops::DerefMut,
    path::Path,
    sync::{Arc, RwLock},
};
use tokio::sync::{oneshot, Mutex};

pub mod configuration;
pub mod environment;
pub mod middleware;
pub mod settings;
pub mod static_files;
pub mod sync;
pub mod test_utils;

async fn run_stage0(
    settings: Settings,
    off_switch: Arc<Mutex<oneshot::Receiver<()>>>,
    token_bucket: Arc<RwLock<TokenBucket>>,
    connection_manager: StorageConnectionManager,
) -> std::io::Result<bool> {
    warn!("Starting server in bootstrap mode. Please use API to configure the server.");

    let cert_type = find_certs();
    let auth_data = Data::new(AuthData {
        auth_token_secret: settings.auth.token_secret.to_owned(),
        token_bucket,
        debug_no_ssl: settings.server.develop && matches!(cert_type, ServerCertType::None),
        debug_no_access_control: settings.server.develop && settings.server.debug_no_access_control,
    });

    let (restart_switch, mut restart_switch_receiver) = tokio::sync::mpsc::channel::<bool>(1);
    let connection_manager_data_app = Data::new(connection_manager.clone());

    let service_provider = ServiceProvider::new(connection_manager.clone());
    let service_provider_data = Data::new(service_provider);

    let loaders = get_loaders(&connection_manager, service_provider_data.clone()).await;
    let loader_registry_data = Data::new(LoaderRegistry { loaders });

    let restart_switch = Data::new(restart_switch);

    let mut http_server = HttpServer::new(move || {
        App::new()
            .wrap(logger_middleware())
            .wrap(Cors::permissive())
            .wrap(compress_middleware())
            .configure(config_stage0(
                connection_manager_data_app.clone(),
                loader_registry_data.clone(),
                service_provider_data.clone(),
                auth_data.clone(),
                None,
                restart_switch.clone(),
            ))
    })
    .disable_signals();
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
            }

            warn!("No certificates found: Running in HTTP development mode");
            let listener = TcpListener::bind(settings.server.address())
                .expect("Failed to bind server to address");
            http_server = http_server.listen(listener)?;
        }
    }
    let running_sever = http_server.run();
    let server_handle = running_sever.handle();
    // run server in another task so that we can handle restart/off events here
    actix_web::rt::spawn(running_sever);

    let mut off_switch = off_switch.lock().await;
    let off_switch = off_switch.deref_mut();
    let ctrl_c = tokio::signal::ctrl_c();
    let restart = tokio::select! {
        _ = ctrl_c => false,
        _ = off_switch => false,
        _ = restart_switch_receiver.recv() => true,
    };
    // gracefully shutdown the server
    server_handle.stop(true).await;
    Ok(restart)
}

/// Return true if restart has been requested
async fn run_server(
    config_settings: Settings,
    prefer_config_settings: bool,
    off_switch: Arc<Mutex<oneshot::Receiver<()>>>,
    token_bucket: Arc<RwLock<TokenBucket>>,
    connection_manager: StorageConnectionManager,
) -> std::io::Result<bool> {
    let service_provider = ServiceProvider::new(connection_manager.clone());

    let service = SettingsService {};
    let service_context = service_provider.context().unwrap();
    let db_settings = service.sync_settings(&service_context).unwrap();
    let sync_settings = if prefer_config_settings {
        config_settings.sync.clone().or(db_settings)
    } else {
        db_settings.or(config_settings.sync.clone())
    };
    let sync_settings = match sync_settings {
        Some(sync_settings) => sync_settings,
        // No sync settings found, start in stage0 mode
        None => {
            return run_stage0(
                config_settings,
                off_switch,
                token_bucket.clone(),
                connection_manager,
            )
            .await
        }
    };

    let cert_type = find_certs();
    let auth_data = Data::new(AuthData {
        auth_token_secret: config_settings.auth.token_secret.to_owned(),
        token_bucket: token_bucket.clone(),
        debug_no_ssl: config_settings.server.develop && matches!(cert_type, ServerCertType::None),
        debug_no_access_control: config_settings.server.develop
            && config_settings.server.debug_no_access_control,
    });

    let (restart_switch, mut restart_switch_receiver) = tokio::sync::mpsc::channel::<bool>(1);
    let connection_manager_data_app = Data::new(connection_manager.clone());

    let service_provider = ServiceProvider::new(connection_manager.clone());
    let service_provider_data = Data::new(service_provider);

    let loaders = get_loaders(&connection_manager, service_provider_data.clone()).await;
    let loader_registry_data = Data::new(LoaderRegistry { loaders });

    let sync_settings_data = Some(Data::new(sync_settings.clone()));

    let restart_switch = Data::new(restart_switch);

    let mut synchroniser = Synchroniser::new(sync_settings, connection_manager.clone()).unwrap();
    // Do the initial pull before doing anything else
    match synchroniser.initial_pull().await {
        Ok(_) => {}
        Err(err) => {
            error!("Failed to perform the initial sync: {}", err);
            if !config_settings.server.develop {
                warn!("Falling back to bootstrap mode");
                return run_stage0(
                    config_settings,
                    off_switch,
                    token_bucket,
                    connection_manager,
                )
                .await;
            }
        }
    };

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
                restart_switch.clone(),
            ))
            .configure(config_static_files)
    })
    .disable_signals();
    match cert_type {
        ServerCertType::SelfSigned(cert_path) => {
            let ssl_builder = load_certs(cert_path).expect("Invalid self signed certificates");
            http_server = http_server.bind_openssl(
                format!(
                    "{}:{}",
                    config_settings.server.host, config_settings.server.port
                ),
                ssl_builder,
            )?;
        }
        ServerCertType::None => {
            if !config_settings.server.develop {
                error!("No certificates found");
                return Err(std::io::Error::new(
                    ErrorKind::Other,
                    "Certificate required in production",
                ));
            }

            warn!("No certificates found: Run in HTTP development mode");
            let listener = TcpListener::bind(config_settings.server.address())
                .expect("Failed to bind server to address");
            http_server = http_server.listen(listener)?;
        }
    }
    let running_sever = http_server.run();
    let server_handle = running_sever.handle();
    // run server in another task so that we can handle restart/off events here
    actix_web::rt::spawn(running_sever);

    let mut off_switch = off_switch.lock().await;
    let off_switch = off_switch.deref_mut();
    let ctrl_c = tokio::signal::ctrl_c();
    let restart = tokio::select! {
        _ = ctrl_c => false,
        _ = off_switch => false,
        _ = restart_switch_receiver.recv() => true,
        () = async {
            synchroniser.run().await;
        } => unreachable!("Synchroniser unexpectedly died!?"),
    };

    server_handle.stop(true).await;
    Ok(restart)
}

/// Starts the server
///
/// This method doesn't return until a message is send to the off_switch.
pub async fn start_server(
    config_settings: Settings,
    off_switch: oneshot::Receiver<()>,
) -> std::io::Result<()> {
    let connection_manager = get_storage_connection_manager(&config_settings.database);

    info!("Run DB migrations...");
    match run_db_migrations(&connection_manager.connection().unwrap()) {
        Ok(_) => info!("DB migrations succeeded"),
        Err(err) => {
            let msg = format!("Failed to run DB migrations: {}", err);
            error!("{}", msg);
            panic!("{}", msg);
        }
    };

    // allow the off_switch to be passed around during multiple server stages
    let off_switch = Arc::new(Mutex::new(off_switch));
    let mut prefer_config_settings = true;
    let token_bucket = Arc::new(RwLock::new(TokenBucket::new()));
    loop {
        match run_server(
            config_settings.clone(),
            prefer_config_settings,
            off_switch.clone(),
            token_bucket.clone(),
            connection_manager.clone(),
        )
        .await
        {
            Ok(restart) => {
                if !restart {
                    break;
                }

                // restart the server in next loop
                info!("Restart server");
                // use DB settings in next restart
                prefer_config_settings = false;
            }
            Err(err) => return Err(err),
        }
    }

    info!("Remote server stopped");
    Ok(())
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
