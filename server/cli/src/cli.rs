use anyhow::anyhow;
use async_graphql::EmptySubscription;
use chrono::Utc;
use clap::StructOpt;
use cli::RefreshDatesRepository;
use graphql::{Mutations, OperationalSchema, Queries};
use log::info;
use repository::{
    get_storage_connection_manager, test_db, KeyType, KeyValueStoreRepository,
    SyncBufferRowRepository,
};
use serde::{Deserialize, Serialize};
use server::configuration;
use service::{
    apis::login_v4::LoginUserInfoV4,
    auth_data::AuthData,
    login::{LoginInput, LoginService},
    plugin::validation::sign_plugin,
    service_provider::{ServiceContext, ServiceProvider},
    settings::Settings,
    sync::{
        file_sync_driver::FileSyncDriver, settings::SyncSettings, sync_status::logger::SyncLogger,
        synchroniser::integrate_and_translate_sync_buffer, synchroniser_driver::SynchroniserDriver,
    },
    token_bucket::TokenBucket,
};
use simple_log::LogConfigBuilder;
use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Arc, RwLock},
};
use util::inline_init;

const DATA_EXPORT_FOLDER: &str = "data";

/// omSupply remote server cli
#[derive(clap::Parser)]
#[clap(version, about)]
struct Args {
    #[clap(subcommand)]
    action: Action,
}

#[derive(clap::Subcommand)]
enum Action {
    /// Export graphql schema
    ExportGraphqlSchema,
    /// Initialise empty database (existing database will be dropped, and new one created and migrated)
    InitialiseDatabase,
    /// Initilise from running mSupply server (uses configuration/.*yaml for sync credentials), drops existin database, creates new database with latest schema and initialises (syncs) initial data from central server (including users)
    /// Can use env variables to override .yaml configurations, i.e. to override sync username `APP_SYNC__USERNAME='demo' remote_server_cli initalise-from-central -u "user1:user1password,user2:user2password" -p "sync_site_password"
    InitialiseFromCentral {
        /// Users to sync, in format "username:password,username2:password2"
        #[clap(short, long)]
        users: String,
    },
    /// Export initialisation data from running mSupply server (uses configuration/.*yaml for sync credentials).
    /// Can use env variables to override .yaml configurations, i.e. to override sync username `APP_SYNC__USERNAME='demo' remote_server_cli export-initialisation -u "user1:user1password,user2:user2password" -n "demoexport"
    /// IMPORTANT: Should not be used on large data files
    ExportInitialisation {
        /// Name for export of initialisation data (will be saved inside `data` folder)
        #[clap(short, long)]
        name: String,
        /// Users to sync in format "username:password,username2:password2"
        #[clap(short, long)]
        users: String,
        /// Prettify json output
        #[clap(long, parse(from_flag))]
        pretty: bool,
    },
    /// Initialise database from exported data), drops existing database, creates new database with latest schema and initialises (syncs) from exported file, also disabling sync to avoid initialised data syncing to any server
    InitialiseFromExport {
        /// Name for import of initialisation data (from `data` folder)
        #[clap(short, long)]
        name: String,
        /// Refresh dates (see refresh-dates --help)
        #[clap(short, long, parse(from_flag))]
        refresh: bool,
    },
    /// Make data current, base on latest date difference to now (takes the latest datetime out of all datetimes, compares to now and adjust all dates and datetimes by the difference), also disabling sync to avoid refreshed data syncing
    RefreshDates,

    SignPlugin {
        /// Path to the plugin.
        /// The plugin manifest and signature will be placed into the plugin directory
        #[clap(short, long)]
        path: String,

        /// Path to the private key file for signing the plugin
        #[clap(short, long)]
        key: String,

        /// Path to the certificate file matching the private key
        #[clap(short, long)]
        cert: String,
    },
}

#[derive(Serialize, Deserialize)]
struct InitialisationData {
    sync_buffer_rows: Vec<repository::SyncBufferRow>,
    users: Vec<(LoginInput, LoginUserInfoV4)>,
    site_id: i32,
}

async fn initialise_from_central(
    settings: Settings,
    users: &str,
) -> anyhow::Result<(Arc<ServiceProvider>, ServiceContext)> {
    info!("Reseting database");
    test_db::setup(&settings.database).await;
    info!("Finished database reset");

    let connection_manager = get_storage_connection_manager(&settings.database);
    let app_data_folder = settings
        .clone()
        .server
        .base_dir
        .ok_or(anyhow!("based dir not set in yaml configurations"))?;
    let service_provider = Arc::new(ServiceProvider::new(
        connection_manager.clone(),
        &app_data_folder,
    ));

    let sync_settings = settings
        .clone()
        .sync
        .ok_or(anyhow!("sync settings not set in yaml configurations"))?;
    let central_server_url = sync_settings.url.clone();

    let auth_data = AuthData {
        auth_token_secret: "secret".to_string(),
        token_bucket: Arc::new(RwLock::new(TokenBucket::new())),
        no_ssl: true,
        debug_no_access_control: false,
    };

    let service_context = service_provider.basic_context()?;
    info!("Initialising from central");
    service_provider
        .site_info_service
        .request_and_set_site_info(&service_provider, &sync_settings)
        .await?;
    service_provider
        .settings
        .update_sync_settings(&service_context, &sync_settings)?;

    // file_sync_trigger is not used here, but easier to just create it rather than making file sync trigger optional
    let (file_sync_trigger, _file_sync_driver) = FileSyncDriver::init(&settings);
    let (_, sync_driver) = SynchroniserDriver::init(file_sync_trigger);
    sync_driver.sync(service_provider.clone()).await;

    info!("Syncing users");
    for user in users.split(',') {
        let user = user.split(':').collect::<Vec<&str>>();
        let input = LoginInput {
            username: user[0].to_string(),
            password: user[1].to_string(),
            central_server_url: central_server_url.clone(),
        };
        LoginService::login(&service_provider, &auth_data, input.clone(), 0)
            .await
            .map_err(|_| anyhow!("Cannot login with user {:?}", input))?;
    }
    info!("Initialisation finished");
    Ok((service_provider, service_context))
}

fn set_server_is_initialised(ctx: &ServiceContext) -> anyhow::Result<()> {
    SyncLogger::start(&ctx.connection)?.done()?;
    Ok(())
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    simple_log::new(LogConfigBuilder::builder().output_console().build())
        .expect("Unable to initialise logger");

    let args = Args::parse();

    let settings: Settings =
        configuration::get_configuration().expect("Problem loading configurations");

    match args.action {
        Action::ExportGraphqlSchema => {
            info!("Exporting graphql schema");
            let schema =
                OperationalSchema::build(Queries::new(), Mutations::new(), EmptySubscription)
                    .finish();
            fs::write("schema.graphql", schema.sdl())?;
            info!("Schema exported in schema.graphql");
        }
        Action::InitialiseDatabase => {
            info!("Resetting database");
            test_db::setup(&settings.database).await;
            info!("Finished database reset");
        }
        Action::InitialiseFromCentral { users } => {
            initialise_from_central(settings, &users).await?;
        }
        Action::ExportInitialisation {
            name,
            users,
            pretty,
        } => {
            let url = settings
                .sync
                .clone()
                .ok_or(anyhow!("sync settings not set in yaml configurations"))?
                .url;
            let (service_provider, ctx) = initialise_from_central(settings, &users).await?;

            info!("Syncing users");
            let mut synced_user_info_rows = Vec::new();
            for user in users.split(',') {
                let user = user.split(':').collect::<Vec<&str>>();
                let input = LoginInput {
                    username: user[0].to_string(),
                    password: user[1].to_string(),
                    central_server_url: url.to_string(),
                };
                synced_user_info_rows.push((
                    input.clone(),
                    LoginService::fetch_user_from_central(&input)
                        .await
                        .unwrap_or_else(|_| panic!("Cannot find user {:?}", input)),
                ));
            }

            let data = InitialisationData {
                // Sync Buffer Rows
                sync_buffer_rows: SyncBufferRowRepository::new(&ctx.connection).get_all()?,
                users: synced_user_info_rows,
                site_id: service_provider
                    .site_info_service
                    .get_site_id(&ctx)?
                    .unwrap(),
            };

            let data_string = if pretty {
                serde_json::to_string_pretty(&data)
            } else {
                serde_json::to_string(&data)
            }?;

            info!("Saving export");
            let (folder, export_file, users_file) = export_paths(&name);
            if fs::create_dir(&folder).is_err() {
                info!("Export directory already exists, replacing {:#?}", folder)
            };
            fs::write(export_file, data_string)?;
            fs::write(users_file, users)?;
            info!("Export saved in {}", folder.to_str().unwrap());
        }
        Action::InitialiseFromExport { name, refresh } => {
            test_db::setup(&settings.database).await;

            let connection_manager = get_storage_connection_manager(&settings.database);
            let hardware_id = settings
                .server
                .base_dir
                .ok_or(anyhow!("based dir not set in yaml configurations"))?;
            let service_provider = Arc::new(ServiceProvider::new(
                connection_manager.clone(),
                &hardware_id,
            ));
            let ctx = service_provider.basic_context()?;

            let (_, import_file, users_file) = export_paths(&name);

            info!("Initialising from {}", import_file.to_str().unwrap());

            let data: InitialisationData = serde_json::from_slice(&fs::read(import_file)?)?;

            info!("Integrate sync buffer");
            // Need to set site_id before integration
            KeyValueStoreRepository::new(&ctx.connection)
                .set_i32(KeyType::SettingsSyncSiteId, Some(data.site_id))?;
            let buffer_repo = SyncBufferRowRepository::new(&ctx.connection);
            let buffer_rows = data
                .sync_buffer_rows
                .into_iter()
                .map(|mut r| {
                    r.integration_datetime = None;
                    r.integration_error = None;
                    r
                })
                .collect();
            buffer_repo.upsert_many(&buffer_rows)?;

            let mut logger = SyncLogger::start(&ctx.connection).unwrap();
            integrate_and_translate_sync_buffer(&ctx.connection, false, Some(&mut logger), None)?;

            info!("Initialising users");
            for (input, user_info) in data.users {
                LoginService::update_user(&ctx, &input.password, user_info).unwrap();
            }

            if refresh {
                info!("Refreshing dates");
                let result = RefreshDatesRepository::new(&ctx.connection)
                    .refresh_dates(Utc::now().naive_utc())?;
                info!("Refresh data result: {:#?}", result);
            }

            info!("Disabling sync");
            // Need to store SyncSettings in db to avoid bootstrap mode
            let service = &service_provider.settings;
            service.update_sync_settings(
                &ctx,
                &inline_init(|r: &mut SyncSettings| {
                    r.url = "http://0.0.0.0:0".to_string();
                    r.interval_seconds = 100000000;
                    r.username = "Sync is disabled (datafile initialise from file".to_string();
                }),
            )?;
            service.disable_sync(&ctx)?;

            // Allows server to start without initialisation or accessing central server
            set_server_is_initialised(&ctx)?;

            info!(
                "Initialisation done, available users: {}",
                fs::read_to_string(users_file)?
            );
        }
        Action::RefreshDates => {
            let connection_manager = get_storage_connection_manager(&settings.database);
            let connection = connection_manager.connection()?;
            let app_data_folder = settings
                .server
                .base_dir
                .ok_or(anyhow!("based dir not set in yaml configurations"))?;

            info!("Refreshing dates");
            let result =
                RefreshDatesRepository::new(&connection).refresh_dates(Utc::now().naive_utc())?;

            let service_provider = Arc::new(ServiceProvider::new(
                connection_manager.clone(),
                &app_data_folder,
            ));
            let ctx = service_provider.basic_context()?;
            let service = &service_provider.settings;
            info!("Disabling sync");
            service.disable_sync(&ctx)?;

            info!("Refresh data result: {:#?}", result);
        }
        Action::SignPlugin { path, key, cert } => sign_plugin(&path, &key, &cert)?,
    }

    Ok(())
}

fn export_paths(name: &str) -> (PathBuf, PathBuf, PathBuf) {
    let export_folder = Path::new(DATA_EXPORT_FOLDER).join(name);
    let export_file_path = export_folder.join("export.json");
    let users_file_path = export_folder.join("users.txt");

    (export_folder, export_file_path, users_file_path)
}
