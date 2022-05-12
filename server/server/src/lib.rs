use crate::{cors::cors_policy, static_files::config_static_files};

use self::{
    middleware::{compress as compress_middleware, logger as logger_middleware},
    settings::Settings,
    sync::Synchroniser,
};
use graphql_core::loader::{get_loaders, LoaderRegistry};

use graphql::{config as graphql_config, config_stage0};
use log::{error, info, warn};
use repository::{get_storage_connection_manager, run_db_migrations, StorageConnectionManager};
use rustls::ServerConfig;
use service::{
    auth_data::AuthData,
    service_provider::ServiceProvider,
    settings_service::{SettingsService, SettingsServiceTrait},
    token_bucket::TokenBucket,
};

use actix_web::{web::Data, App, HttpServer};
use settings::ServerSettings;
use std::{
    io::{BufReader, ErrorKind},
    net::TcpListener,
    ops::DerefMut,
    path::PathBuf,
    sync::{Arc, RwLock},
};
use tokio::sync::{oneshot, Mutex};
use util::uuid::uuid;

pub mod configuration;
pub mod cors;
pub mod environment;
pub mod middleware;
pub mod settings;
pub mod static_files;
pub mod sync;
pub mod test_utils;

const CERTS_PATH_DEFAULT: &str = "./certs";

fn auth_data(
    server_settings: &ServerSettings,
    token_bucket: Arc<RwLock<TokenBucket>>,
    token_secret: String,
    cert_type: &ServerCertType,
) -> Data<AuthData> {
    Data::new(AuthData {
        auth_token_secret: token_secret,
        token_bucket,
        danger_no_ssl: (server_settings.develop || server_settings.danger_allow_http)
            && matches!(cert_type, ServerCertType::None),
        debug_no_access_control: server_settings.develop && server_settings.debug_no_access_control,
    })
}

async fn run_stage0(
    config_settings: Settings,
    off_switch: Arc<Mutex<oneshot::Receiver<()>>>,
    token_bucket: Arc<RwLock<TokenBucket>>,
    token_secret: String,
    connection_manager: StorageConnectionManager,
) -> std::io::Result<bool> {
    warn!("Starting server in bootstrap mode. Please use API to configure the server.");

    let cert_type = find_certs(
        config_settings
            .server
            .certs_dir
            .as_deref()
            .unwrap_or(CERTS_PATH_DEFAULT),
    );
    let auth_data = auth_data(
        &config_settings.server,
        token_bucket,
        token_secret,
        &cert_type,
    );

    let (restart_switch, mut restart_switch_receiver) = tokio::sync::mpsc::channel::<bool>(1);
    let connection_manager_data_app = Data::new(connection_manager.clone());

    let service_provider = ServiceProvider::new(connection_manager.clone());
    let service_provider_data = Data::new(service_provider);

    let loaders = get_loaders(&connection_manager, service_provider_data.clone()).await;
    let loader_registry_data = Data::new(LoaderRegistry { loaders });

    let restart_switch = Data::new(restart_switch);

    let closure_settings = config_settings.clone();

    let mut http_server = HttpServer::new(move || {
        let cors = cors_policy(&closure_settings);
        App::new()
            .wrap(logger_middleware())
            .wrap(cors)
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
        ServerCertType::SelfSigned(cert_files) => {
            let config = load_certs(cert_files).expect("Invalid self signed certificates");
            http_server = http_server.bind_rustls(
                format!(
                    "{}:{}",
                    config_settings.server.host, config_settings.server.port
                ),
                config,
            )?;
        }
        ServerCertType::None => {
            if !config_settings.server.develop && !config_settings.server.danger_allow_http {
                error!("No certificates found");
                return Err(std::io::Error::new(
                    ErrorKind::Other,
                    "Certificate required",
                ));
            }

            warn!("No certificates found: Running in HTTP development mode");
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
    token_secret: String,
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
                token_secret,
                connection_manager,
            )
            .await
        }
    };

    let cert_type = find_certs(
        config_settings
            .server
            .certs_dir
            .as_deref()
            .unwrap_or(CERTS_PATH_DEFAULT),
    );
    let auth_data = auth_data(
        &config_settings.server,
        token_bucket.clone(),
        token_secret.clone(),
        &cert_type,
    );

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
                    token_secret,
                    connection_manager,
                )
                .await;
            }
        }
    };

    let closure_settings = config_settings.clone();
    let mut http_server = HttpServer::new(move || {
        let cors = cors_policy(&closure_settings);
        App::new()
            .wrap(logger_middleware())
            .wrap(cors)
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
        ServerCertType::SelfSigned(cert_files) => {
            let config = load_certs(cert_files).expect("Invalid self signed certificates");
            http_server = http_server.bind_rustls(
                format!(
                    "{}:{}",
                    config_settings.server.host, config_settings.server.port
                ),
                config,
            )?;
        }
        ServerCertType::None => {
            if !config_settings.server.develop && !config_settings.server.danger_allow_http {
                error!("No certificates found");
                return Err(std::io::Error::new(
                    ErrorKind::Other,
                    "Certificate required",
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

    if let Some(init_sql) = &config_settings.database.init_sql {
        connection_manager.execute(init_sql).unwrap();
    }

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
    let token_secret = uuid();
    loop {
        match run_server(
            config_settings.clone(),
            prefer_config_settings,
            off_switch.clone(),
            token_bucket.clone(),
            token_secret.clone(),
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

#[derive(Debug)]
pub struct SelfSignedCertFiles {
    pub private_cert_file: String,
    pub public_cert_file: String,
}

/// Details about the certs used by the running server
#[derive(Debug)]
pub enum ServerCertType {
    None,
    SelfSigned(SelfSignedCertFiles),
}

pub const PRIVATE_CERT_FILE: &str = "key.pem";
pub const PUBLIC_CERT_FILE: &str = "cert.pem";

fn find_certs(cert_dir: &str) -> ServerCertType {
    let key_file = PathBuf::new().join(cert_dir).join(PRIVATE_CERT_FILE);
    let cert_file = PathBuf::new().join(cert_dir).join(PUBLIC_CERT_FILE);
    if !key_file.exists() || !cert_file.exists() {
        return ServerCertType::None;
    }
    return ServerCertType::SelfSigned(SelfSignedCertFiles {
        private_cert_file: key_file.to_string_lossy().to_string(),
        public_cert_file: cert_file.to_string_lossy().to_string(),
    });
}

/// Load rustls server config
fn load_certs(cert_files: SelfSignedCertFiles) -> Result<ServerConfig, anyhow::Error> {
    let certfile = std::fs::File::open(&cert_files.public_cert_file)?;
    let mut reader = BufReader::new(certfile);
    let certs = rustls_pemfile::certs(&mut reader)
        .unwrap()
        .iter()
        .map(|v| rustls::Certificate(v.clone()))
        .collect();

    let private_key = load_private_key(&cert_files.private_cert_file)?;

    let config = ServerConfig::builder()
        .with_safe_defaults()
        .with_no_client_auth()
        .with_single_cert(certs, private_key)?;
    Ok(config)
}

/// Helper to load a rustls::PrivateKey
fn load_private_key(filename: &str) -> Result<rustls::PrivateKey, anyhow::Error> {
    let keyfile = std::fs::File::open(filename)?;
    let mut reader = BufReader::new(keyfile);

    loop {
        match rustls_pemfile::read_one(&mut reader)? {
            Some(rustls_pemfile::Item::RSAKey(key)) => return Ok(rustls::PrivateKey(key)),
            Some(rustls_pemfile::Item::PKCS8Key(key)) => return Ok(rustls::PrivateKey(key)),
            Some(rustls_pemfile::Item::ECKey(key)) => return Ok(rustls::PrivateKey(key)),
            None => break,
            _ => {}
        }
    }

    Err(anyhow::Error::msg("No private key found"))
}
