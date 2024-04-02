#[cfg(not(target_os = "android"))]
extern crate machine_uid;

use crate::{
    certs::Certificates, cold_chain::config_cold_chain, configuration::get_or_create_token_secret,
    cors::cors_policy, middleware::central_server_only, print::config_print,
    serve_frontend::config_serve_frontend, static_files::config_static_files,
    support::config_support, sync_on_central::config_sync_on_central,
    upload_fridge_tag::config_upload_fridge_tag,
};

use self::middleware::{compress as compress_middleware, logger as logger_middleware};
use actix_cors::Cors;
use anyhow::Context;
use graphql_core::loader::{get_loaders, LoaderRegistry};

use graphql::{
    attach_discovery_graphql_schema, attach_graphql_schema, GraphSchemaData, GraphqlSchema,
};
use log::info;
use repository::{get_storage_connection_manager, migrations::migrate};

use service::{
    auth_data::AuthData,
    plugin::validation::ValidatedPluginBucket,
    processors::Processors,
    service_provider::ServiceProvider,
    settings::{is_develop, ServerSettings, Settings},
    sync::{
        file_sync_driver::FileSyncDriver,
        synchroniser_driver::{SiteIsInitialisedCallback, SynchroniserDriver},
    },
    token_bucket::TokenBucket,
};

use actix_web::{web::Data, App, HttpServer};
use std::sync::{Arc, Mutex, RwLock};
use util::is_central_server;

pub mod certs;
pub mod cold_chain;
pub mod configuration;
pub mod cors;
pub mod environment;
mod logging;
pub mod middleware;
mod serve_frontend;
pub mod static_files;
pub mod support;
mod upload_fridge_tag;
pub use self::logging::*;
pub mod print;
mod sync_on_central;

// Only import discovery for non android features (otherwise build for android targets would fail due to local-ip-address)
#[cfg(not(target_os = "android"))]
mod discovery;

/// Starts the server
///
/// # Arguments
/// * `settings` - Server settings (manually defined for android and from .yaml file for other)
/// * `off_switch` - For android or windows service to turn off server
///
/// This method doesn't return until a message is sent to the off_switch
pub async fn start_server(
    settings: Settings,
    mut off_switch: tokio::sync::mpsc::Receiver<()>,
) -> std::io::Result<()> {
    info!(
        "{} server starting in {} mode on port {}",
        match is_central_server() {
            true => "Central",
            false => "Remote",
        },
        match is_develop() {
            true => "Development",
            false => "Production",
        },
        settings.server.port
    );

    // INITIALISE DATABASE AND CONNECTION
    let connection_manager = get_storage_connection_manager(&settings.database);
    if let Some(init_sql) = &settings.database.full_init_sql() {
        connection_manager.execute(init_sql).unwrap();
    }
    info!("Run DB migrations...");
    let version = migrate(&connection_manager.connection().unwrap(), None)
        .context("Failed to run DB migrations")
        .unwrap();
    info!("Run DB migrations...done");

    if is_central_server() {
        info!("Running as central");
    }

    // INITIALISE CONTEXT
    info!("Initialising server context..");
    let (processors_trigger, processors) = Processors::init();
    let (file_sync_trigger, file_sync_driver) = FileSyncDriver::init(&settings);
    let (sync_trigger, synchroniser_driver) = SynchroniserDriver::init(file_sync_trigger.clone()); // Cloning as we want to expose this for stop messages
    let (site_is_initialise_trigger, site_is_initialised_callback) =
        SiteIsInitialisedCallback::init();

    let service_provider = Data::new(ServiceProvider::new_with_triggers(
        connection_manager.clone(),
        &settings.server.base_dir.clone().unwrap(),
        processors_trigger,
        sync_trigger,
        site_is_initialise_trigger,
    ));
    let loaders = get_loaders(&connection_manager, service_provider.clone()).await;
    let certificates = Certificates::try_load(&settings.server).unwrap();
    let token_bucket = Arc::new(RwLock::new(TokenBucket::new()));
    let token_secret = get_or_create_token_secret(&connection_manager.connection().unwrap());
    let auth = auth_data(&settings.server, token_bucket, token_secret, &certificates);
    info!("Initialising server context..done");

    // LOGGING
    let service_context = service_provider.basic_context().unwrap();
    let log_service = &service_provider.log_service;
    info!("Checking log settings..");
    let log_level = log_service.get_log_level(&service_context).unwrap();

    if settings.logging.is_some() {
        log_service
            .set_log_directory(
                &service_context,
                settings.logging.clone().unwrap().directory,
            )
            .unwrap();

        log_service
            .set_log_file_name(&service_context, settings.logging.clone().unwrap().filename)
            .unwrap();
    }

    if log_level.is_none() && settings.logging.is_some() {
        log_service
            .update_log_level(&service_context, settings.logging.clone().unwrap().level)
            .unwrap();
    }

    // SET HARDWARE UUID
    info!("Setting hardware uuid..");
    #[cfg(not(target_os = "android"))]
    let machine_uid = machine_uid::get().expect("Failed to query OS for hardware id");

    #[cfg(target_os = "android")]
    let machine_uid = settings
        .server
        .machine_uid
        .clone()
        .unwrap_or("".to_string());
    service_provider
        .app_data_service
        .set_hardware_id(machine_uid.clone())
        .unwrap();
    info!("Setting hardware uuid..done [{}]", machine_uid.clone());

    // CHECK SYNC STATUS
    info!("Checking sync status..");
    let yaml_sync_settings = settings.sync.clone();
    let database_sync_settings = service_provider
        .settings
        .sync_settings(&service_context)
        .unwrap();

    // Need to set sync settings in database if they are provided via yaml configurations
    let force_trigger_sync_on_startup = match (database_sync_settings, yaml_sync_settings) {
        // If we are changing sync setting via yaml configurations, need to check against central server
        // to confirm that site is still the same (request_and_set_site_info checks site UUID)
        (Some(database_sync_settings), Some(yaml_sync_settings)) => {
            if database_sync_settings.core_site_details_changed(&yaml_sync_settings) {
                info!("Sync settings in configurations don't match database");
                info!("Checking sync credentials are for the same site..");
                service_provider
                    .site_info_service
                    .request_and_set_site_info(&service_provider, &yaml_sync_settings)
                    .await
                    .unwrap();
                info!("Checking sync credentials are for the same site..done");
            }
            service_provider
                .settings
                .update_sync_settings(&service_context, &yaml_sync_settings)
                .unwrap();
            // Settings are set in database -> try syncing on startup
            true
        }
        (None, Some(yaml_sync_settings)) => {
            info!("Sync settings in configurations and not in database");
            info!("Checking sync credentials..");
            // If fresh sync settings provided in yaml, check credentials against central server and save them in database
            service_provider
                .site_info_service
                .request_and_set_site_info(&service_provider, &yaml_sync_settings)
                .await
                .unwrap();
            info!("Checking sync credentials..done");
            service_provider
                .settings
                .update_sync_settings(&service_context, &yaml_sync_settings)
                .unwrap();
            // Settings are set in database -> try syncing on startup
            true
        }
        // Settings are set in database -> try syncing on startup
        (Some(_), None) => true,
        // Settings are not set in database -> don't try syncing on startup
        (None, None) => false,
    };

    // CREATE GRAPHQL SCHEMA
    let is_operational = service_provider
        .sync_status_service
        .is_initialised(&service_context)
        .unwrap();
    info!(
        "Creating graphql schema in {} mode..",
        match is_operational {
            true => "operational",
            false => "initialisation",
        }
    );

    let validated_plugins = ValidatedPluginBucket::new(&settings.server.base_dir).unwrap();
    let validated_plugins = Data::new(Mutex::new(validated_plugins));

    let graphql_schema = Data::new(GraphqlSchema::new(
        GraphSchemaData {
            connection_manager: Data::new(connection_manager),
            loader_registry: Data::new(LoaderRegistry { loaders }),
            service_provider: service_provider.clone(),
            settings: Data::new(settings.clone()),
            auth: auth.clone(),
            validated_plugins: validated_plugins.clone(),
        },
        is_operational,
    ));
    // Bind trigger to change schema when site is initialised
    if !is_operational {
        let graphql_schema = graphql_schema.clone();
        site_is_initialised_callback.on_trigger(async move {
            info!("Changing graphql schema to operational mode");
            graphql_schema.clone().toggle_is_operational(true).await;
        });
    }
    info!("Creating graphql schema..done",);

    // START DISCOVERY
    // Don't do discovery in android
    #[cfg(not(target_os = "android"))]
    {
        info!("Starting server DNS-SD discovery",);
        discovery::start_discovery(certificates.protocol(), settings.server.port, machine_uid);
    }

    info!("Starting discovery graphql server",);
    let closure_service_provider = service_provider.clone();
    // See attach_discovery_graphql_schema for more details
    actix_web::rt::spawn(
        HttpServer::new(move || {
            App::new()
                .wrap(Cors::permissive())
                .configure(attach_discovery_graphql_schema(
                    closure_service_provider.clone(),
                ))
        })
        .bind(settings.server.discovery_address())?
        .run(),
    );

    // ADD SYSTEM USER
    service_provider
        .general_service
        .create_system_user(&service_provider)
        .unwrap();

    // CREATE MISSING MASTER LIST AND PROGRAM
    service_provider
        .general_service
        .create_missing_master_list_and_program(&service_provider)
        .unwrap();

    // START SERVER
    info!("Initialising http server..",);
    let processors_task = processors.spawn(service_provider.clone().into_inner());
    let synchroniser_task = synchroniser_driver.run(
        service_provider.clone().into_inner(),
        force_trigger_sync_on_startup,
    );
    let file_sync_task = file_sync_driver.run(service_provider.clone().into_inner());

    let closure_settings = settings.clone();
    let mut http_server = HttpServer::new(move || {
        App::new()
            .app_data(Data::new(closure_settings.clone()))
            // .wrap(logger_middleware())
            .wrap(cors_policy(&closure_settings))
            .wrap(compress_middleware())
            // needed for static files service
            .app_data(Data::new(closure_settings.clone()))
            // needed for cold chain service
            .app_data(service_provider.clone())
            .app_data(auth.clone())
            .app_data(validated_plugins.clone())
            .configure(attach_graphql_schema(graphql_schema.clone()))
            .configure(config_static_files)
            .configure(config_cold_chain)
            .configure(config_upload_fridge_tag)
            .configure(config_sync_on_central)
            .configure(config_support)
            .configure(config_print)
            // Needs to be last to capture all unmatches routes
            .configure(config_serve_frontend)
    })
    .disable_signals();

    http_server = match certificates.config() {
        Some(config) => http_server
            .bind_rustls(settings.server.address(), config)
            .unwrap(),
        None => http_server.bind(settings.server.address()).unwrap(),
    };
    info!("Initialising http server..done",);

    let running_server = http_server.run();
    let server_handle = running_server.handle();
    info!(
        "Server started, running on port: {}, version: {}",
        settings.server.port, version
    );
    // run server in another task so that we can handle restart/off events here
    actix_web::rt::spawn(running_server);

    tokio::select! {
        // TODO log error in ctrl_c and None in off_switch
        _ = tokio::signal::ctrl_c() => {},
        Some(_) = off_switch.recv() => {},
        _ = synchroniser_task => unreachable!("Synchroniser unexpectedly stopped"),
        _ = file_sync_task => unreachable!("File sync unexpectedly stopped"),
        result = processors_task => unreachable!("Processor terminated ({:?})", result)
    };

    server_handle.stop(true).await;

    Ok(())
}

fn auth_data(
    server_settings: &ServerSettings,
    token_bucket: Arc<RwLock<TokenBucket>>,
    token_secret: String,
    certificates: &Certificates,
) -> Data<AuthData> {
    Data::new(AuthData {
        auth_token_secret: token_secret,
        token_bucket,
        no_ssl: !certificates.is_https(),
        debug_no_access_control: is_develop() && server_settings.debug_no_access_control,
    })
}
