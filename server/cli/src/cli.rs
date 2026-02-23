use anyhow::anyhow;
use async_graphql::EmptySubscription;
use chrono::Utc;
use clap::{ArgAction, Parser};
use graphql::{Mutations, OperationalSchema, Queries};
use log::info;

use repository::{
    get_storage_connection_manager, migrations::migrate, test_db, KeyType,
    KeyValueStoreRepository, SyncBufferRowRepository,
};
use serde::{Deserialize, Serialize};
use server::{configuration, logging_init};
use service::{
    apis::login_v4::LoginUserInfoV4,
    auth_data::AuthData,
    login::{LoginInput, LoginService},
    plugin::validation::sign_plugin,
    service_provider::{ServiceContext, ServiceProvider},
    settings::Settings,
    sync::{
        file_sync_driver::FileSyncDriver, settings::SyncSettings, sync_buffer::SyncBufferSource,
        sync_status::logger::SyncLogger, synchroniser::integrate_and_translate_sync_buffer,
        synchroniser_driver::SynchroniserDriver,
    },
    token_bucket::TokenBucket,
};
use std::{
    fs,
    path::{Path, PathBuf},
    sync::{Arc, RwLock},
};

mod backup;
use backup::*;

#[cfg(feature = "integration_test")]
use cli::LoadTest;
use cli::{
    build_reports, generate_and_install_plugin_bundle, generate_plugin_bundle,
    generate_plugin_typescript_types, install_plugin_bundle, reload_embedded_reports,
    show_report, toggle_report, upsert_report, upsert_reports, GenerateAndInstallPluginBundle,
    GeneratePluginBundle, InstallPluginBundle, RefreshDatesRepository, ShowReportArgs,
    UpsertReportArgs,
};

const DATA_EXPORT_FOLDER: &str = "data";

/// omSupply remote server cli
#[derive(clap::Parser)]
#[clap(version, about)]
struct Args {
    #[clap(subcommand)]
    action: Action,

    #[clap(flatten)]
    config_args: configuration::ConfigArgs,
}

#[derive(clap::Subcommand)]
enum Action {
    /// Export graphql schema
    ExportGraphqlSchema {
        #[clap(short, long)]
        path: Option<PathBuf>,
    },
    /// Initialise empty database (existing database will be dropped, and new one created and migrated)
    InitialiseDatabase,
    /// Apply any pending migrations to the database, drop and build views
    Migrate,
    /// Initialise from running mSupply server (uses configuration/.*yaml for sync credentials), drops existing database, creates new database with latest schema and initialises (syncs) initial data from central server (including users)
    /// Can use env variables to override .yaml configurations, i.e. to override sync username `APP_SYNC__USERNAME='demo' remote_server_cli initialise-from-central -u "user1:user1password,user2:user2password" -p "sync_site_password"
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
        #[clap(long, action = ArgAction::SetTrue)]
        pretty: bool,
    },
    /// Initialise database from exported data), drops existing database, creates new database with latest schema and initialises (syncs) from exported file, also disabling sync to avoid initialised data syncing to any server
    InitialiseFromExport {
        /// Name for import of initialisation data (from `data` folder)
        #[clap(short, long)]
        name: String,
        /// Refresh dates (see refresh-dates --help)
        #[clap(short, long, action = ArgAction::SetTrue)]
        refresh: bool,
    },
    /// Make data current, based on the difference between the latest date to the current date (takes the latest datetime out of all datetimes, compares to now and adjust all dates and datetimes by the difference)
    /// This process also disables sync to avoid refreshed data syncing, unless you use the `--enable-sync` flag
    RefreshDates {
        /// Enable sync after refresh, by default the sync is disabled after refreshing
        #[clap(short, long, action = ArgAction::SetTrue)]
        enable_sync: bool,
    },

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
    /// Helper tool to upsert report to local omSupply instance, helpful when developing reports, especially with argument schema
    UpsertReport(UpsertReportArgs),
    /// Will back up database to a generated folder (the name of which will be returned).
    /// Folder will be generated in the backup directory specified by configuration file.
    /// User can specify max number of backup to keep, see example configuration file
    Backup,
    Restore(RestoreArguments),
    BuildReports {
        /// Optional reports path. If supplied, this dir should be the same structure as per standard reports.
        /// Will generate a json of all reports within this directory
        #[clap(short, long, num_args=0..)]
        path: Option<Vec<PathBuf>>,
    },
    /// Will generate a plugin bundle
    GeneratePluginBundle(GeneratePluginBundle),
    /// Will insert generated plugin bundle
    InstallPluginBundle(InstallPluginBundle),
    /// Will generate and then install  plugin bundle
    GenerateAndInstallPluginBundle(GenerateAndInstallPluginBundle),
    UpsertReports {
        /// Optional reports json path. This needs to be of type ReportsData. If none supplied, will upload the standard generated reports
        #[clap(short, long, num_args=0..)]
        path: Option<Vec<PathBuf>>,

        /// Overwrite any pre-existing reports
        #[clap(short, long, action = ArgAction::SetTrue)]
        overwrite: bool,
    },
    /// Reload and overwrite the embedded reports
    ReloadEmbeddedReports,
    ShowReport(ShowReportArgs),
    /// Enable or disable a report in the database.
    ToggleReport {
        /// Code of the report to toggle
        #[clap(short, long)]
        code: String,

        /// Filter by custom status
        #[clap(short, long)]
        is_custom: Option<bool>,

        /// Set is_enabled to true
        #[clap(short, long, action = ArgAction::SetTrue, conflicts_with="disable")]
        enable: bool,

        /// Set is_enabled to false
        #[clap(short, long, action = ArgAction::SetTrue, conflicts_with="enable")]
        disable: bool,
    },
    #[cfg(feature = "integration_test")]
    LoadTest(LoadTest),
    GeneratePluginTypescriptTypes {
        /// Optional path to save typescript types, if not provided will save to `../client/packages/plugins/backendCommon/generated`
        #[clap(
            short,
            long,
            default_value = "../client/packages/plugins/backendCommon/generated"
        )]
        path: PathBuf,
        /// Run prettier on the generated typescript files
        #[clap(long, short, default_value = "false")]
        skip_prettify: bool,
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
    let service_provider = Arc::new(ServiceProvider::new(connection_manager.clone()));

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
    sync_driver.sync(service_provider.clone(), None).await;

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
    let args = Args::parse();

    let settings: Settings =
        configuration::get_configuration(args.config_args).expect("Problem loading configurations");

    let log_level = settings.logging.clone().map(|l| l.level);

    // Initialise logger with default config (i.e. to console), don't want CLI errors logging to
    // runtime log file, but respect the configured log level
    logging_init(None, log_level);

    match args.action {
        Action::ExportGraphqlSchema { path } => {
            info!("Exporting graphql schema");
            let schema =
                OperationalSchema::build(Queries::new(), Mutations::new(), EmptySubscription)
                    .finish();
            fs::write(
                path.unwrap_or(PathBuf::from("schema.graphql")),
                schema.sdl(),
            )?;
            info!("Schema exported in schema.graphql");
        }
        Action::InitialiseDatabase => {
            info!("Resetting database");
            test_db::setup(&settings.database).await;
            info!("Finished database reset");
        }
        Action::Migrate => {
            info!("Applying database migrations");
            let connection_manager = get_storage_connection_manager(&settings.database);
            if let Some(init_sql) = &settings.database.startup_sql() {
                connection_manager.execute(init_sql).unwrap();
            }
            migrate(&connection_manager.connection().unwrap(), None)
                .expect("Failed to run DB migrations");

            info!("Finished applying database migrations");
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
                    LoginService::fetch_user_from_central(&service_provider.clone(), &input)
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
            let service_provider = Arc::new(ServiceProvider::new(connection_manager.clone()));
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
            integrate_and_translate_sync_buffer(
                &ctx.connection,
                Some(&mut logger),
                SyncBufferSource::Central(0),
            )?;

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
                &SyncSettings {
                    url: "http://0.0.0.0:0".to_string(),
                    interval_seconds: 100000000,
                    username: "Sync is disabled (datafile initialise from file".to_string(),
                    ..Default::default()
                },
            )?;
            service.disable_sync(&ctx)?;

            // Allows server to start without initialisation or accessing central server
            set_server_is_initialised(&ctx)?;

            info!(
                "Initialisation done, available users: {}",
                fs::read_to_string(users_file)?
            );
        }
        Action::RefreshDates { enable_sync } => {
            let connection_manager = get_storage_connection_manager(&settings.database);
            let connection = connection_manager.connection()?;

            info!("Refreshing dates");
            let result =
                RefreshDatesRepository::new(&connection).refresh_dates(Utc::now().naive_utc())?;

            let service_provider = Arc::new(ServiceProvider::new(connection_manager.clone()));
            let ctx = service_provider.basic_context()?;
            let service = &service_provider.settings;

            if !enable_sync {
                info!("Disabling sync");
                service.disable_sync(&ctx)?;
            }

            info!("Refresh data result: {:#?}", result);
        }
        Action::SignPlugin { path, key, cert } => sign_plugin(&path, &key, &cert)?,
        Action::BuildReports { path } => {
            build_reports(path)?;
        }
        Action::UpsertReports { path, overwrite } => {
            upsert_reports(path, overwrite, &settings)?;
        }
        // TODO fix these inputs. Should extract these fields from the report manifest
        // also not necessarily custom / version 1.0 etc.
        // Command currently unsafe.
        Action::UpsertReport(args) => {
            upsert_report(args, &settings)?;
        }
        Action::ReloadEmbeddedReports => {
            reload_embedded_reports(&settings)?;
        }
        Action::Backup => {
            backup(&settings)?;
        }
        Action::Restore(arguments) => {
            restore(&settings, arguments)?;
        }
        Action::GeneratePluginBundle(arguments) => {
            generate_plugin_bundle(arguments)?;
        }
        Action::InstallPluginBundle(arguments) => {
            install_plugin_bundle(arguments).await?;
        }
        Action::GenerateAndInstallPluginBundle(arguments) => {
            generate_and_install_plugin_bundle(arguments).await?;
        }
        Action::ShowReport(args) => {
            show_report(args).await?;
        }
        Action::ToggleReport {
            code,
            is_custom,
            enable,
            disable,
        } => {
            toggle_report(code, is_custom, enable, disable, &settings)?;
        }
        Action::GeneratePluginTypescriptTypes {
            path,
            skip_prettify,
        } => {
            generate_plugin_typescript_types(path, skip_prettify)?;
        }
        #[cfg(feature = "integration_test")]
        Action::LoadTest(LoadTest {
            msupply_central_url,
            oms_central_url,
            base_port,
            output_dir,
            test_site_name,
            test_site_pass,
            sites,
            lines,
            duration,
        }) => {
            let load_test = LoadTest::new(
                msupply_central_url,
                oms_central_url,
                base_port,
                output_dir,
                test_site_name,
                test_site_pass,
                sites,
                lines,
                duration,
            );
            load_test.run().await?;
        }
    }

    Ok(())
}

fn export_paths(name: &str) -> (PathBuf, PathBuf, PathBuf) {
    let export_folder = Path::new(DATA_EXPORT_FOLDER).join(name);
    let export_file_path = export_folder.join("export.json");
    let users_file_path = export_folder.join("users.txt");

    (export_folder, export_file_path, users_file_path)
}
