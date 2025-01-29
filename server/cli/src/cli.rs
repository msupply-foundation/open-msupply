use anyhow::anyhow;
use async_graphql::EmptySubscription;
use chrono::Utc;
use clap::{ArgAction, Parser};
use cli::RefreshDatesRepository;
use graphql::{Mutations, OperationalSchema, Queries};
use log::info;
use report_builder::{build::build_report_definition, BuildArgs};

use repository::{
    get_storage_connection_manager, schema_from_row, test_db, ContextType, EqualFilter,
    FormSchemaRow, FormSchemaRowRepository, KeyType, KeyValueStoreRepository, ReportFilter,
    ReportRepository, ReportRow, ReportRowRepository, SyncBufferRowRepository,
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
    standard_reports::{ReportData, ReportsData, StandardReports},
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
    process::{Command, Stdio},
    sync::{Arc, RwLock},
};

use util::inline_init;

mod backup;
use backup::*;

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
    UpsertReport {
        /// Report id (any user defined id)
        #[clap(short, long)]
        id: String,

        /// Path to the report
        #[clap(short, long)]
        report_path: PathBuf,

        /// Path to the arguments json form schema
        #[clap(long)]
        arguments_path: Option<PathBuf>,

        /// Path to the arguments json form UI schema
        #[clap(long)]
        arguments_ui_path: Option<PathBuf>,

        /// Report name
        #[clap(short, long)]
        name: String,

        /// Report type/context
        #[clap(short, long)]
        context: ContextType,

        /// Report sub context
        #[clap(short, long)]
        sub_context: Option<String>,
    },
    /// Will back up database to a generated folder (the name of which will be returned).
    /// Folder will be generated in the backup directory specified by configuration file.
    /// User can specify max number of backup to keep, see example configuration file
    Backup,
    Restore(RestoreArguments),
    BuildReports {
        /// Optional reports path. If supplied, this dir should be the same structure as per standard reports.
        /// Will generate a json of all reports within this directory
        #[clap(short, long)]
        path: Option<PathBuf>,
    },
    UpsertReports {
        /// Optional reports json path. This needs to be of type ReportsData. If none supplied, will upload the standard generated reports
        #[clap(short, long)]
        json_path: Option<PathBuf>,
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
            integrate_and_translate_sync_buffer(&ctx.connection, Some(&mut logger), None)?;

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
            let connection_manager = get_storage_connection_manager(&settings.database);
            let con = connection_manager.connection()?;
            let base_reports_dir = match path.clone() {
                Some(path) => path,
                None => PathBuf::new().join("reports"),
            };
            let report_names: Vec<PathBuf> = fs::read_dir(base_reports_dir.clone())?
                .filter_map(|r| r.ok())
                .map(|e| e.path())
                .filter(|p| p.is_dir())
                .filter(|name| name != &Path::new("reports").join("generated"))
                .map(|p| p)
                .collect();

            let mut reports_data = ReportsData { reports: vec![] };

            for name_dir in report_names {
                let report_versions: Vec<PathBuf> = fs::read_dir(&name_dir)?
                    .filter_map(|r| r.ok())
                    .map(|e| e.path())
                    .filter(|p| p.is_dir())
                    .map(|p| p)
                    .collect();

                let parent = name_dir
                    .components()
                    .next()
                    .expect("failed to read report name directory");
                let name = name_dir.strip_prefix(parent).unwrap();

                for version_dir in report_versions {
                    // install esbuild depedencies
                    if let Err(e) = run_yarn_install(&version_dir) {
                        eprintln!(
                            "Failed to run yarn install in {}: {}",
                            version_dir.display(),
                            e
                        );
                        continue;
                    }
                    // read manifest file

                    let manifest_file =
                        fs::File::open(version_dir.join("manifest.json")).expect(&format!(
                            "manifest file should open read only in report {:?} {:?}",
                            name, version_dir
                        ));

                    let manifest: Manifest =
                        serde_json::from_reader(manifest_file).expect(&format!(
                            "manifest json not formatted correctly {:?} {:?}",
                            name, version_dir
                        ));
                    let code = manifest.code;

                    let version = manifest.version;
                    let id_version = str::replace(&version, ".", "_");

                    let context = manifest.context;
                    let report_name = manifest.name;
                    let is_custom = manifest.is_custom;
                    let id = format!("{code}_{id_version}_{is_custom}");
                    let sub_context = manifest.sub_context;
                    let arguments_path = manifest
                        .arguments
                        .clone()
                        .and_then(|a| a.schema)
                        .and_then(|schema| Some(version_dir.join(schema)));
                    let arguments_ui_path = manifest
                        .arguments
                        .and_then(|a| a.ui)
                        .and_then(|ui| Some(version_dir.join(ui)));
                    let graphql_query = manifest.queries.clone().and_then(|q| q.gql);
                    let sql_queries = manifest.queries.clone().and_then(|q| q.sql);
                    let convert_data = manifest
                        .convert_data
                        .and_then(|cd| Some(version_dir.join(cd)));
                    let custom_wasm_function = manifest.custom_wasm_function;
                    let query_default = manifest.query_default;

                    let args = BuildArgs {
                        dir: version_dir.join("src"),
                        output: Some(version_dir.join("generated").join("built_report.json")),
                        template: "template.html".to_string(),
                        header: manifest.header,
                        footer: manifest.footer,
                        query_gql: graphql_query,
                        query_default: query_default,
                        query_sql: sql_queries,
                        convert_data,
                        custom_wasm_function,
                    };

                    let report_definition = build_report_definition(&args)
                        .map_err(|_| anyhow!("Failed to build report {:?}", id))?;

                    let filter = ReportFilter::new().id(EqualFilter::equal_to(&id));
                    let existing_report =
                        ReportRepository::new(&con).query_by_filter(filter)?.pop();

                    let argument_schema_id = existing_report
                        .and_then(|r| r.argument_schema.as_ref().map(|r| r.id.clone()));

                    let form_schema_json = match (arguments_path, arguments_ui_path) {
                        (Some(_), None) | (None, Some(_)) => {
                            return Err(anyhow!(
                                "When arguments_path is specified arguments_ui_path must also be specified in report and vice versa {:?} {:?}", name, version_dir
                            ))
                        }
                        (Some(arguments_path), Some(arguments_ui_path)) => {
                            Some(schema_from_row(FormSchemaRow {
                                id: argument_schema_id.unwrap_or(format!("for_report_{}", id)),
                                r#type: "reportArgument".to_string(),
                                json_schema: fs::read_to_string(arguments_path)?,
                                ui_schema: fs::read_to_string(arguments_ui_path)?,
                            })?)
                        }
                        (None, None) => None,
                    };

                    let report_data = ReportData {
                        id,
                        name: report_name,
                        r#type: repository::ReportType::OmSupply,
                        template: report_definition,
                        context,
                        sub_context,
                        argument_schema_id: form_schema_json.clone().map(|r| r.id.clone()),
                        comment: None,
                        is_custom,
                        version: version.to_string(),
                        code,
                        form_schema: form_schema_json,
                    };

                    reports_data.reports.push(report_data);
                }
            }

            let output_name = if path.is_some() {
                "reports.json"
            } else {
                "standard_reports.json"
            };

            let output_path = base_reports_dir.join("generated").join(output_name);

            fs::create_dir_all(output_path.parent().ok_or(anyhow::Error::msg(format!(
                "Invalid output path: {:?}",
                output_path
            )))?)?;

            fs::write(&output_path, serde_json::to_string_pretty(&reports_data)?).map_err(
                |_| {
                    anyhow::Error::msg(format!(
                        "Failed to write to {:?}. Does output dir exist?",
                        output_path
                    ))
                },
            )?;

            if let Some(path) = path {
                info!("All reports built in custom path {:?}", path);
            } else {
                info!("All standard reports built")
            };
        }
        Action::UpsertReports { json_path } => {
            let standard_reports_dir = Path::new("reports")
                .join("generated")
                .join("standard_reports.json");

            let json_file = match json_path {
                Some(json_path) => fs::File::open(json_path),
                None => fs::File::open(standard_reports_dir.clone()),
            }
            .expect(&format!(
                "{} not found for report",
                standard_reports_dir.display()
            ));
            let reports_data: ReportsData =
                serde_json::from_reader(json_file).expect("json incorrectly formatted for report");

            let connection_manager = get_storage_connection_manager(&settings.database);
            let con = connection_manager.connection()?;

            let _ = StandardReports::upsert_reports(reports_data, &con);
        }
        Action::UpsertReport {
            id,
            report_path,
            arguments_path,
            arguments_ui_path,
            name,
            context,
            sub_context,
        } => {
            let connection_manager = get_storage_connection_manager(&settings.database);
            let con = connection_manager.connection()?;

            let filter = ReportFilter::new().id(EqualFilter::equal_to(&id));
            let existing_report = ReportRepository::new(&con).query_by_filter(filter)?.pop();

            let argument_schema_id =
                existing_report.and_then(|r| r.argument_schema.as_ref().map(|r| r.id.clone()));

            let form_schema_json = match (arguments_path, arguments_ui_path) {
                (Some(_), None) | (None, Some(_)) => {
                    return Err(anyhow!(
                        "When arguments path are specified both paths must be present"
                    ))
                }
                (Some(arguments_path), Some(arguments_ui_path)) => {
                    Some(schema_from_row(FormSchemaRow {
                        id: argument_schema_id.unwrap_or(format!("for_report_{}", id)),
                        r#type: "reportArgument".to_string(),
                        json_schema: fs::read_to_string(arguments_path)?,
                        ui_schema: fs::read_to_string(arguments_ui_path)?,
                    })?)
                }
                (None, None) => None,
            };

            if let Some(form_schema_json) = &form_schema_json {
                FormSchemaRowRepository::new(&con).upsert_one(form_schema_json)?;
            }

            ReportRowRepository::new(&con).upsert_one(&ReportRow {
                id: id.clone(),
                name,
                r#type: repository::ReportType::OmSupply,
                template: fs::read_to_string(report_path)?,
                context,
                sub_context,
                argument_schema_id: form_schema_json.map(|r| r.id.clone()),
                comment: None,
                is_custom: true,
                version: "1.0".to_string(),
                code: id,
            })?;

            info!("Report upserted");
        }
        Action::Backup => {
            backup(&settings)?;
        }
        Action::Restore(arguments) => {
            restore(&settings, arguments)?;
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

fn run_yarn_install(directory: &PathBuf) -> Result<(), Box<dyn std::error::Error>> {
    let convert_dir = directory.join("convert_data_js");

    if !convert_dir.exists() {
        info!(
            "No conversion function for {}. Skipping esbuild install.",
            convert_dir.display().to_string()
        );
        return Ok(());
    }

    let node_modules_path = convert_dir.join("node_modules");

    if !node_modules_path.exists() {
        let status = Command::new("yarn")
            .args(["install", "--cwd"])
            .arg(convert_dir)
            .args(["--no-lockfile", "--check-files"])
            .stdout(Stdio::inherit())
            .stderr(Stdio::inherit())
            .status()?;

        if !status.success() {
            info!("Error: `yarn install` failed");
            return Err("Failed to run yarn install".into());
        }
    } else {
        info!("Dependencies up to date");
    }

    Ok(())
}

#[derive(serde::Deserialize, Clone)]
pub struct Manifest {
    pub is_custom: bool,
    pub version: String,
    pub code: String,
    pub context: ContextType,
    pub sub_context: Option<String>,
    pub name: String,
    pub header: Option<String>,
    pub footer: Option<String>,
    pub queries: Option<ManifestQueries>,
    pub default_query: Option<String>,
    pub arguments: Option<Arguments>,
    pub test_arguments: Option<TestReportArguments>,
    pub convert_data: Option<String>,
    pub custom_wasm_function: Option<String>,
    pub query_default: Option<String>,
}

#[derive(serde::Deserialize, Clone)]
pub struct ManifestQueries {
    pub gql: Option<String>,
    pub sql: Option<Vec<String>>,
}

#[derive(serde::Deserialize, Clone)]
pub struct Arguments {
    pub schema: Option<String>,
    pub ui: Option<String>,
}

#[derive(serde::Deserialize, Clone)]
pub struct TestReportArguments {
    pub arguments: Option<String>,
    pub reference_data: Option<String>,
    pub data_id: Option<String>,
}
