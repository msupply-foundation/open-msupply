#[cfg(not(target_os = "android"))]
extern crate machine_uid;

use crate::{
    certs::Certificates, configuration::get_or_create_token_secret, cors::cors_policy,
    serve_frontend::config_server_frontend, static_files::config_static_files,
};

use self::middleware::{compress as compress_middleware, logger as logger_middleware};
use graphql_core::loader::{get_loaders, LoaderRegistry};

use graphql::{attach_graphql_schema, GraphSchemaData, GraphqlSchema};
use log::info;
use repository::{get_storage_connection_manager, run_db_migrations};

use service::{
    auth_data::AuthData,
    processors::Processors,
    service_provider::ServiceProvider,
    settings::{is_develop, ServerSettings, Settings},
    sync::synchroniser_driver::{SiteIsInitialisedCallback, SynchroniserDriver},
    token_bucket::TokenBucket,
};

use actix_web::{web::Data, App, HttpServer};
use std::sync::{Arc, RwLock};
use tokio::sync::oneshot;

pub mod certs;
pub mod configuration;
pub mod cors;
pub mod environment;
pub mod middleware;
mod serve_frontend;
pub mod static_files;

// Only import discovery for non android features (otherwise build for android targets would fail due to local-ip-address)
#[cfg(not(target_os = "android"))]
mod discovery;

/// Starts the server
///
/// This method doesn't return until a message is send to the off_switch.
pub async fn start_server(
    settings: Settings,
    off_switch: oneshot::Receiver<()>,
) -> std::io::Result<()> {
    info!(
        "Server starting in {} mode",
        match is_develop() {
            true => "Development",
            false => "Production",
        }
    );

    // INITIALISE DATABASE AND CONNECTION
    let connection_manager = get_storage_connection_manager(&settings.database);
    if let Some(init_sql) = &settings.database.full_init_sql() {
        connection_manager.execute(init_sql).unwrap();
    }
    info!("Run DB migrations...");
    run_db_migrations(&connection_manager.connection().unwrap(), true)
        .expect("Failed to run DB migrations");
    info!("Run DB migrations...done");

    // INITIALISE CONTEXT
    info!("Initialising server context..");
    let (processors_trigger, processors) = Processors::init();
    let (sync_trigger, synchroniser_driver) = SynchroniserDriver::init();
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

    // SET HARDWARE UUID
    info!("Setting hardware uuid..");
    #[cfg(not(target_os = "android"))]
    let machine_uid = machine_uid::get().expect("Failed to query OS for hardware id");

    #[cfg(target_os = "android")]
    let machine_uid = config_settings
        .server
        .machine_uid
        .clone()
        .unwrap_or("".to_string());
    service_provider
        .app_data_service
        .set_hardware_id(machine_uid)
        .unwrap();
    info!("Setting hardware uuid..done");

    // CHECK SYNC STATUS
    info!("Checking sync status..");
    let service_context = service_provider.basic_context().unwrap();
    let yaml_sync_settings = settings.sync.clone();
    let database_sync_settings = service_provider
        .settings
        .sync_settings(&service_context)
        .unwrap();

    let force_trigger_sync_on_startup = match (database_sync_settings, yaml_sync_settings) {
        // If we are changing sync setting via yaml configurations, need to check against central server
        // to confirm that site is still the same (request_and_set_site_info checks site UUID)
        (Some(database_sync_settings), Some(yaml_sync_settings)) => {
            if database_sync_settings.core_site_details_changed(&yaml_sync_settings) {
                info!("Sync settings in configurations dont match database");
                info!("Checking sync credentails are for the same site..");
                service_provider
                    .site_info_service
                    .request_and_set_site_info(&service_provider, &yaml_sync_settings)
                    .await
                    .unwrap();
                info!("Checking sync credentails are for the same site..done");
            }
            service_provider
                .settings
                .update_sync_settings(&service_context, &yaml_sync_settings)
                .unwrap();
            false
        }
        (None, Some(yaml_sync_settings)) => {
            info!("Sync settings in configurations and not in database");
            info!("Checking sync credentails..");
            // If fresh sync settings provided in yaml, check credentials against central server and save them in database
            service_provider
                .site_info_service
                .request_and_set_site_info(&service_provider, &yaml_sync_settings)
                .await
                .unwrap();
            info!("Checking sync credentails..done");
            service_provider
                .settings
                .update_sync_settings(&service_context, &yaml_sync_settings)
                .unwrap();
            true
        }
        _ => false,
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
    let graphql_schema = Data::new(GraphqlSchema::new(
        GraphSchemaData {
            connection_manager: Data::new(connection_manager),
            loader_registry: Data::new(LoaderRegistry { loaders }),
            service_provider: service_provider.clone(),
            settings: Data::new(settings.clone()),
            auth,
            // TODO what what this like before ?
            include_logger: true,
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
        info!("Starting server discovery",);
        let _ = discovery::Discovery::start(discovery::ServerInfo::new(
            certificates.protocol(),
            &settings.server,
        ));
    }

    // START SERVER
    info!("Initialising http server..",);
    let processors_task = processors.spawn(service_provider.clone().into_inner());
    let syncrhoniser_task = synchroniser_driver.run(
        service_provider.clone().into_inner(),
        force_trigger_sync_on_startup,
    );

    let closure_settings = settings.clone();
    let mut http_server = HttpServer::new(move || {
        App::new()
            .wrap(logger_middleware())
            .wrap(cors_policy(&closure_settings))
            .wrap(compress_middleware())
            .configure(attach_graphql_schema(graphql_schema.clone()))
            .configure(config_static_files)
            .configure(config_server_frontend)
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
    info!("Server started, running on port: {}", settings.server.port);
    // run server in another task so that we can handle restart/off events here
    actix_web::rt::spawn(running_server);
    let ctrl_c = tokio::signal::ctrl_c();
    tokio::select! {
        _ = ctrl_c => {},
        _ = off_switch => {},
        _ = syncrhoniser_task => unreachable!("Synchroniser unexpectedly died!?"),
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
