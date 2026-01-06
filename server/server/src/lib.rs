#[cfg(not(target_os = "android"))]
extern crate machine_uid;

use crate::{
    central::config_central, certs::Certificates, cold_chain::config_cold_chain,
    configuration::get_or_create_token_secret, cors::cors_policy,
    custom_translations::config_custom_translations, middleware::central_server_only,
    print::config_print, serve_frontend::config_serve_frontend, static_files::config_static_files,
    support::config_support, upload_fridge_tag::config_upload_fridge_tag,
};

use self::middleware::{compress as compress_middleware, logger as logger_middleware};
use actix_cors::Cors;
use anyhow::Context;
use graphql_core::loader::{get_loaders, LoaderRegistry};

use graphql::{
    attach_discovery_graphql_schema, attach_graphql_schema, GraphSchemaData, GraphqlSchema,
    PluginExecuteGraphql,
};
use log::info;
use repository::{get_storage_connection_manager, migrations::migrate};

use scheduled_tasks::spawn_scheduled_task_runner;
use service::{
    auth_data::AuthData,
    boajs::context::BoaJsContext,
    ledger_fix::ledger_fix_driver::LedgerFixDriver,
    plugin::validation::ValidatedPluginBucket,
    processors::Processors,
    service_provider::ServiceProvider,
    settings::{is_develop, ServerSettings, Settings},
    standard_reports::StandardReports,
    sync::{
        file_sync_driver::FileSyncDriver,
        synchroniser_driver::{SiteIsInitialisedCallback, SynchroniserDriver},
        CentralServerConfig,
    },
    token_bucket::TokenBucket,
};

use actix_web::{web, web::Data, App, HttpServer};
use std::sync::{Arc, Mutex, RwLock};

mod authentication;
pub mod certs;
pub mod cold_chain;
pub mod configuration;
pub mod cors;
pub mod environment;
mod logging;
pub mod middleware;
mod scheduled_tasks;
mod serve_frontend;
pub mod static_files;
pub mod support;
mod upload_fridge_tag;
pub use self::logging::*;
mod custom_translations;
mod serve_frontend_plugins;
mod upload;

mod central;
pub mod print;

use serve_frontend_plugins::config_server_frontend_plugins;
use upload::config_upload;
// Only import discovery for non android features (otherwise build for android targets would fail due to local-ip-address)
#[cfg(any(target_os = "macos", target_os = "windows"))]
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
        "{} server starting on port {}",
        match is_develop() {
            true => "Development",
            false => "Production",
        },
        settings.server.port
    );

    // ON STARTUP OVERRIDE IS CENTRAL SERVER
    if settings.server.override_is_central_server {
        CentralServerConfig::set_is_central_server_on_startup();
    }

    // INITIALISE DATABASE AND CONNECTION
    let connection_manager = get_storage_connection_manager(&settings.database);

    if let Some(init_sql) = &settings.database.startup_sql() {
        connection_manager.execute(init_sql).unwrap();
    }

    info!("Run DB migrations...");
    let version = migrate(&connection_manager.connection().unwrap(), None)
        .context("Failed to run DB migrations")
        .unwrap();
    info!("Run DB migrations...done");

    // Upsert standard reports
    StandardReports::load_reports(&connection_manager.connection().unwrap(), false).unwrap();

    // INITIALISE CONTEXT
    info!("Initialising server context..");
    let (processors_trigger, processors) = Processors::init();
    let (file_sync_trigger, file_sync_driver) = FileSyncDriver::init(&settings);
    let (sync_trigger, synchroniser_driver) = SynchroniserDriver::init(file_sync_trigger.clone()); // Cloning as we want to expose this for stop messages
    let (ledger_fix_trigger, ledger_fix_driver) = LedgerFixDriver::init();
    let (site_is_initialise_trigger, site_is_initialised_callback) =
        SiteIsInitialisedCallback::init();

    let service_provider = Data::new(ServiceProvider::new_with_triggers(
        connection_manager.clone(),
        processors_trigger,
        sync_trigger,
        ledger_fix_trigger,
        site_is_initialise_trigger,
        settings.mail.clone(),
    ));
    let loaders = get_loaders(&connection_manager, service_provider.clone()).await;
    let certificates = Certificates::try_load(&settings.server).unwrap();
    let token_bucket = Arc::new(RwLock::new(TokenBucket::new()));
    let token_secret = get_or_create_token_secret(&connection_manager.connection().unwrap());
    let auth = auth_data(&settings.server, token_bucket, token_secret, &certificates);
    info!("Initialising server context..done");

    let service_context = service_provider.basic_context().unwrap();

    // LOGGING
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
    info!("Getting hardware uuid..");
    #[cfg(not(target_os = "android"))]
    let machine_uid = machine_uid::get().expect("Failed to query OS for hardware id");

    #[cfg(target_os = "android")]
    let machine_uid = settings
        .server
        .machine_uid
        .clone()
        .unwrap_or("".to_string());

    info!("Setting hardware uuid [{}]", machine_uid.clone());
    service_provider
        .app_data_service
        .set_hardware_id(machine_uid.clone())
        .unwrap();
    info!("Setting hardware uuid.. done");

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
    info!("Creating graphql schema..done");

    // PLUGIN CONTEXT
    info!("Creating plugin context and reloading plugins..");
    BoaJsContext::new(
        &service_provider,
        PluginExecuteGraphql(graphql_schema.clone()),
    )
    .bind();

    service_provider
        .plugin_service
        .reload_all_plugins(&service_context)
        .unwrap();
    info!("Creating plugin context and reloading plugins..done");

    // START DISCOVERY
    // Only run discovery on Mac or Windows
    #[cfg(any(target_os = "macos", target_os = "windows"))]
    {
        use service::settings::DiscoveryMode;
        let discovery_enabled = match settings.server.discovery {
            DiscoveryMode::Disabled => false,
            DiscoveryMode::Enabled => true,
            DiscoveryMode::Auto => {
                if is_develop() {
                    log::warn!("DNS-SD discovery is automatically disabled in dev mode, add `discovery: Enabled` to local.yaml to turn it on");
                    false
                } else {
                    true
                }
            }
        };
        if discovery_enabled {
            info!("Starting server DNS-SD discovery",);
            discovery::start_discovery(certificates.protocol(), settings.server.port, machine_uid);
        } else {
            info!("Server DNS-SD discovery disabled",);
        }
    }

    info!("Starting discovery graphql server",);
    let closure_service_provider = service_provider.clone();
    // See attach_discovery_graphql_schema for more details
    tokio::spawn(
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

    // START SERVER
    info!("Initialising http server..",);
    let processors_task = processors.spawn(service_provider.clone().into_inner());
    let synchroniser_task = synchroniser_driver.run(
        service_provider.clone().into_inner(),
        force_trigger_sync_on_startup,
    );
    let ledger_fix_task = ledger_fix_driver.run(service_provider.clone().into_inner());
    let file_sync_task = file_sync_driver.run(service_provider.clone().into_inner());

    // Scheduled tasks
    let scheduled_task_handle = spawn_scheduled_task_runner(
        service_provider.clone().into_inner(),
        settings.mail.clone().map(|m| m.interval).unwrap_or(60),
    );

    let closure_settings = settings.clone();
    let mut http_server = HttpServer::new(move || {
        App::new()
            .app_data(Data::new(closure_settings.clone()))
            .wrap(logger_middleware())
            .wrap(cors_policy(&closure_settings))
            .wrap(compress_middleware())
            // needed for static files service
            .app_data(Data::new(closure_settings.clone()))
            // Configure JSON payload limit (default is 2MB, setting to 10MB)
            .app_data(web::JsonConfig::default().limit(10 * 1024 * 1024))
            // needed for cold chain service
            .app_data(service_provider.clone())
            .app_data(auth.clone())
            .app_data(validated_plugins.clone())
            .configure(attach_graphql_schema(graphql_schema.clone()))
            .configure(config_static_files)
            .configure(config_cold_chain)
            .configure(config_upload_fridge_tag)
            .configure(config_server_frontend_plugins)
            .configure(config_central)
            .configure(config_support)
            .configure(config_print)
            .configure(config_custom_translations)
            .configure(config_upload)
            // Needs to be last to capture all unmatches routes
            .configure(config_serve_frontend)
    })
    .disable_signals();

    http_server = match certificates.config() {
        Some(config) => http_server
            .bind_rustls_0_23(settings.server.address(), config)
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
    tokio::spawn(running_server);

    tokio::select! {
        // TODO log error in ctrl_c and None in off_switch
        _ = tokio::signal::ctrl_c() => {},
        Some(_) = off_switch.recv() => {},
        _ = synchroniser_task => unreachable!("Synchroniser unexpectedly stopped"),
        _ = file_sync_task => unreachable!("File sync unexpectedly stopped"),
          _ = ledger_fix_task => unreachable!("Ledger fix unexpectedly stopped"),
        result = processors_task => unreachable!("Processor terminated ({:?})", result),
        scheduled_error = scheduled_task_handle => unreachable!("Scheduled task stopped unexpectedly: {:?}", scheduled_error),
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
