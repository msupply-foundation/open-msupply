use crate::{
    cors::cors_policy, self_signed_certs::Certificates, serve_frontend::config_server_frontend,
    static_files::config_static_files,
};

use self::{
    middleware::{compress as compress_middleware, logger as logger_middleware},
    sync::Synchroniser,
};
use graphql_core::loader::{get_loaders, LoaderRegistry};

use graphql::{config as graphql_config, config_stage0};
use log::{error, info, warn};
use repository::{get_storage_connection_manager, run_db_migrations, StorageConnectionManager};

use service::{
    auth_data::AuthData,
    service_provider::ServiceProvider,
    settings::{is_develop, ServerSettings, Settings},
    token_bucket::TokenBucket,
};

use actix_web::{web::Data, App, HttpServer};
use std::{
    ops::DerefMut,
    sync::{Arc, RwLock},
};
use tokio::sync::{oneshot, Mutex};
use util::uuid::uuid;

pub mod configuration;
pub mod cors;
pub mod environment;
pub mod middleware;
pub mod self_signed_certs;
mod serve_frontend;
pub mod static_files;
pub mod sync;
pub mod test_utils;

// Only import discovery for non android features (otherwise build for android targets would fail due to local-ip-address)
#[cfg(not(feature = "android"))]
mod discovery;

fn auth_data(
    server_settings: &ServerSettings,
    token_bucket: Arc<RwLock<TokenBucket>>,
    token_secret: String,
    certificates: &Certificates,
) -> Data<AuthData> {
    Data::new(AuthData {
        auth_token_secret: token_secret,
        token_bucket,
        danger_no_ssl: (is_develop() || server_settings.danger_allow_http)
            && certificates.is_https(),
        debug_no_access_control: is_develop() && server_settings.debug_no_access_control,
    })
}

async fn run_stage0(
    config_settings: Settings,
    off_switch: Arc<Mutex<oneshot::Receiver<()>>>,
    token_bucket: Arc<RwLock<TokenBucket>>,
    token_secret: String,
    connection_manager: StorageConnectionManager,
    certificates: &Certificates,
) -> std::io::Result<bool> {
    warn!("Starting server in bootstrap mode. Please use API to configure the server.");

    let auth_data = auth_data(
        &config_settings.server,
        token_bucket,
        token_secret,
        &certificates,
    );

    let (restart_switch, mut restart_switch_receiver) = tokio::sync::mpsc::channel::<bool>(1);
    let connection_manager_data_app = Data::new(connection_manager.clone());

    let service_provider = ServiceProvider::new(
        connection_manager.clone(),
        "app_data", // &config_settings.server.base_dir.clone().unwrap(),
    );

    if service_provider
        .app_data_service
        .get_hardware_id()?
        .is_empty()
    {
        service_provider
            .app_data_service
            .set_hardware_id(uuid().to_ascii_uppercase())?;
    }

    let service_provider_data = Data::new(service_provider);

    let loaders = get_loaders(&connection_manager, service_provider_data.clone()).await;
    let loader_registry_data = Data::new(LoaderRegistry { loaders });

    let restart_switch = Data::new(restart_switch);

    let closure_settings = Data::new(config_settings.clone());

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
                closure_settings.clone(),
                restart_switch.clone(),
            ))
            .configure(config_server_frontend)
    })
    .disable_signals();

    http_server = match certificates.config() {
        Some(config) => http_server.bind_rustls(config_settings.server.address(), config)?,
        None => http_server.bind(config_settings.server.address())?,
    };

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
    off_switch: Arc<Mutex<oneshot::Receiver<()>>>,
    token_bucket: Arc<RwLock<TokenBucket>>,
    token_secret: String,
    connection_manager: StorageConnectionManager,
    certificates: &Certificates,
) -> std::io::Result<bool> {
    let service_provider = ServiceProvider::new(
        connection_manager.clone(),
        "app_data", // &config_settings.server.base_dir.clone().unwrap(),
    );
    let service_context = service_provider.context().unwrap();
    let service = &service_provider.settings;

    let db_settings = service.sync_settings(&service_context).unwrap();
    let sync_settings = db_settings.or(config_settings.sync.clone());
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
                certificates,
            )
            .await
        }
    };
    // Final settings:
    let mut settings = config_settings;
    settings.sync = Some(sync_settings.clone());

    let auth_data = auth_data(
        &settings.server,
        token_bucket.clone(),
        token_secret.clone(),
        &certificates,
    );

    let (restart_switch, mut restart_switch_receiver) = tokio::sync::mpsc::channel::<bool>(1);
    let connection_manager_data_app = Data::new(connection_manager.clone());

    let service_provider = ServiceProvider::new(
        connection_manager.clone(),
        &settings.server.base_dir.clone().unwrap(),
    );
    let service_provider_data = Data::new(service_provider);

    let loaders = get_loaders(&connection_manager, service_provider_data.clone()).await;
    let loader_registry_data = Data::new(LoaderRegistry { loaders });

    let settings_data = Data::new(settings.clone());

    let restart_switch = Data::new(restart_switch);

    let mut synchroniser = Synchroniser::new(sync_settings, service_provider_data.clone()).unwrap();
    // Do the initial pull before doing anything else
    match synchroniser.initial_pull().await {
        Ok(_) => {}
        Err(err) => {
            error!("Failed to perform the initial sync: {}", err);
            if !is_develop() {
                warn!("Falling back to bootstrap mode");
                return run_stage0(
                    settings,
                    off_switch,
                    token_bucket,
                    token_secret,
                    connection_manager,
                    certificates,
                )
                .await;
            }
        }
    };

    let closure_settings = settings.clone();

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
                settings_data.clone(),
                restart_switch.clone(),
            ))
            .app_data(Data::new(closure_settings.clone()))
            .configure(config_static_files)
            .configure(config_server_frontend)
    })
    .disable_signals();

    http_server = match certificates.config() {
        Some(config) => http_server.bind_rustls(settings.server.address(), config)?,
        None => http_server.bind(settings.server.address())?,
    };

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
    match run_db_migrations(&connection_manager.connection().unwrap(), true) {
        Ok(_) => info!("DB migrations succeeded"),
        Err(err) => {
            let msg = format!("Failed to run DB migrations: {}", err);
            error!("{}", msg);
            panic!("{}", msg);
        }
    };

    let certificates = Certificates::load(&config_settings.server)?;

    // Don't do discovery in android
    #[cfg(not(feature = "android"))]
    let _ = discovery::Discovery::start(discovery::ServerInfo::new(
        certificates.protocol(),
        &config_settings.server,
    ));

    // allow the off_switch to be passed around during multiple server stages
    let off_switch = Arc::new(Mutex::new(off_switch));

    let token_bucket = Arc::new(RwLock::new(TokenBucket::new()));
    let token_secret = uuid();
    loop {
        match run_server(
            config_settings.clone(),
            off_switch.clone(),
            token_bucket.clone(),
            token_secret.clone(),
            connection_manager.clone(),
            &certificates,
        )
        .await
        {
            Ok(restart) => {
                if !restart {
                    break;
                }

                // restart the server in next loop
                info!("Restart server");
            }
            Err(err) => return Err(err),
        }
    }

    info!("Remote server stopped");
    Ok(())
}
