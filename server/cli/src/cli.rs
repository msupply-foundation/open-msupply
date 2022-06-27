use actix_web::web::Data;
use chrono::Utc;
use clap::StructOpt;
use cli::RefreshDatesRepository;
use graphql::schema_builder;
use log::info;
use repository::{get_storage_connection_manager, test_db, RemoteSyncBufferRepository};
use reqwest::{Client, Url};
use serde::{Deserialize, Serialize};
use server::{
    configuration,
    sync::{
        central_data_synchroniser::{
            central_sync_batch_records_to_buffer_rows, CentralDataSynchroniser,
        },
        remote_data_synchroniser::{
            remote_sync_batch_records_to_buffer_rows, RemoteDataSynchroniser,
        },
        sync_api_v5::{CentralSyncBatchV5, RemoteSyncBatchV5},
        SyncApiV5, SyncCredentials, Synchroniser,
    },
};
use service::{
    apis::login_v4::LoginUserInfoV4,
    auth_data::AuthData,
    login::{LoginInput, LoginService},
    service_provider::ServiceProvider,
    settings::Settings,
    sync_settings::SyncSettings,
    token_bucket::TokenBucket,
};
use std::{
    env, fs,
    path::{Path, PathBuf},
    sync::{Arc, RwLock},
};
use util::{hash, inline_init};

const DATA_EXPORT_FOLDER: &'static str = "data";

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
    /// Can use env variables to override .yaml configurations, i.e. to override sync username `APP_SYNC__USERNAME='demo' remote_server_cli initalise-from-central -u "user1:user1password,user2:user2password" -f "demoexport.json"
    ExportInitialisation {
        /// Name for export of initialisation data (will be saved inside `data` folder)
        #[clap(short, long)]
        name: String,
        /// Users to sync in format "username:password,username2:password2"
        #[clap(short, long)]
        users: String,
        /// Plain sync password, will overwrite sync.password_256 from configuration/.*yaml (or APP_SYNC__PASSWORD_256 from env var)
        #[clap(short, long)]
        password: Option<String>,
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
}

#[derive(Serialize, Deserialize)]
struct InitialisationData {
    central: CentralSyncBatchV5,
    remote: RemoteSyncBatchV5,
    users: Vec<(LoginInput, LoginUserInfoV4)>,
    site_id: u32,
}

#[tokio::main]
async fn main() {
    env::set_var("RUST_LOG", "info");
    env_logger::init();

    let args = Args::parse();

    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");

    match args.action {
        Action::ExportGraphqlSchema => {
            info!("Exporting graphql schema");
            let schema = schema_builder().finish();
            fs::write("schema.graphql", &schema.sdl()).unwrap();
            info!("Schema exported in schema.graphql");
        }
        Action::InitialiseDatabase => {
            info!("Reseting database");
            test_db::setup(&settings.database).await;
            info!("Finished database reset");
        }
        Action::InitialiseFromCentral { users } => {
            info!("Reseting database");
            test_db::setup(&settings.database).await;
            info!("Finished database reset");

            let connection_manager = get_storage_connection_manager(&settings.database);
            let app_data_folder = settings.server.base_dir.unwrap();
            let service_provider = Data::new(ServiceProvider::new(
                connection_manager.clone(),
                &app_data_folder,
            ));

            let sync_settings = settings.sync.unwrap();
            let central_server_url = sync_settings.url.clone();

            let auth_data = AuthData {
                auth_token_secret: "secret".to_string(),
                token_bucket: Arc::new(RwLock::new(TokenBucket::new())),
                no_ssl: true,
                debug_no_access_control: false,
            };

            info!("Initialising from central");
            Synchroniser::new(sync_settings.clone(), service_provider.clone())
                .unwrap()
                .initial_pull()
                .await
                .unwrap();

            info!("Syncing users");
            for user in users.split(",") {
                let user = user.split(':').collect::<Vec<&str>>();
                let input = LoginInput {
                    username: user[0].to_string(),
                    password: user[1].to_string(),
                    central_server_url: central_server_url.clone(),
                };
                LoginService::login(&service_provider, &auth_data, input.clone(), 0)
                    .await
                    .expect(&format!("Cannot login with user {:?}", input));
            }

            bypass_initialisation(&service_provider, sync_settings.site_id);
            info!("Initialisation finished");
        }
        Action::ExportInitialisation {
            name,
            users,
            password,
            pretty,
        } => {
            let SyncSettings {
                username,
                password_sha256,
                url,
                site_id,
                ..
            } = settings.sync.unwrap();

            // Hash and use password if supplied in cli
            let credentials = SyncCredentials {
                username,
                password_sha256: password
                    .map(|p| hash::sha256(&p))
                    .unwrap_or(password_sha256),
            };

            info!("Syncing users");
            let mut synced_user_info_rows = Vec::new();
            for user in users.split(",") {
                let user = user.split(':').collect::<Vec<&str>>();
                let input = LoginInput {
                    username: user[0].to_string(),
                    password: user[1].to_string(),
                    central_server_url: url.to_string(),
                };
                synced_user_info_rows.push((
                    input.clone(),
                    LoginService::fetch_user_from_central(&input).await.unwrap(),
                ));
            }

            let client = Client::new();
            let url = Url::parse(&url).unwrap();
            let connection_manager = get_storage_connection_manager(&settings.database);
            let app_data_folder = settings.server.base_dir.unwrap();
            let service_provider = Data::new(ServiceProvider::new(
                connection_manager.clone(),
                &app_data_folder,
            ));
            let hardware_id = service_provider.app_data_service.get_hardware_id().unwrap();
            let sync_api_v5 = SyncApiV5::new(
                url.clone(),
                credentials.clone(),
                client.clone(),
                &hardware_id,
            );

            info!("Requesting initialisation");
            sync_api_v5.post_initialise().await.unwrap();
            let data = InitialisationData {
                // sync central
                central: sync_api_v5.get_central_records(0, 1000000).await.unwrap(),
                // sync remote
                remote: sync_api_v5.get_queued_records(1000000).await.unwrap(),
                users: synced_user_info_rows,
                site_id,
            };

            let data_string = if pretty {
                serde_json::to_string_pretty(&data)
            } else {
                serde_json::to_string(&data)
            }
            .unwrap();

            info!("Saving export");
            let (folder, export_file, users_file) = export_paths(&name);
            if let Err(_) = fs::create_dir(&folder) {
                info!("Export directory already exists, replacing {:#?}", folder)
            };
            fs::write(&export_file, data_string).unwrap();
            fs::write(&users_file, users).unwrap();
            info!("Export saved in {}", folder.to_str().unwrap());
        }
        Action::InitialiseFromExport { name, refresh } => {
            test_db::setup(&settings.database).await;

            let connection_manager = get_storage_connection_manager(&settings.database);
            let hardware_id = settings.server.base_dir.unwrap();
            let service_provider = Data::new(ServiceProvider::new(
                connection_manager.clone(),
                &hardware_id,
            ));
            let ctx = service_provider.context().unwrap();

            let (_, import_file, users_file) = export_paths(&name);

            info!("Initialising from {}", import_file.to_str().unwrap());

            let data: InitialisationData =
                serde_json::from_slice(&fs::read(import_file).unwrap()).unwrap();

            info!("Initialising central");
            for central_sync_record in
                central_sync_batch_records_to_buffer_rows(data.central.data).unwrap()
            {
                CentralDataSynchroniser::insert_one_and_update_cursor(
                    &ctx.connection,
                    &central_sync_record,
                )
                .await
                .unwrap()
            }
            CentralDataSynchroniser::integrate_central_records(&ctx.connection)
                .await
                .unwrap();

            info!("Initialising remote");
            if let Some(data) = data.remote.data {
                RemoteSyncBufferRepository::new(&ctx.connection)
                    .upsert_many(&remote_sync_batch_records_to_buffer_rows(data).unwrap())
                    .unwrap();
                RemoteDataSynchroniser::do_integrate_records(&ctx.connection).unwrap()
            }

            info!("Initialising users");
            for (input, user_info) in data.users {
                LoginService::update_user(&ctx, &input.password, user_info).unwrap();
            }

            if refresh {
                info!("Refreshing dates");
                let result = RefreshDatesRepository::new(&ctx.connection)
                    .refresh_dates(Utc::now().naive_local())
                    .expect("Error while refreshing data");
                info!("Refresh data result: {:#?}", result);
            }

            bypass_initialisation(&service_provider, data.site_id);

            info!(
                "Initialisation done, available users: {}",
                fs::read_to_string(users_file).unwrap()
            );
        }
        Action::RefreshDates => {
            let connection_manager = get_storage_connection_manager(&settings.database);
            let connection = connection_manager.connection().unwrap();
            let app_data_folder = settings.server.base_dir.unwrap();

            info!("Refreshing dates");
            let result = RefreshDatesRepository::new(&connection)
                .refresh_dates(Utc::now().naive_local())
                .unwrap();

            let service_provider = Data::new(ServiceProvider::new(
                connection_manager.clone(),
                &app_data_folder,
            ));
            let ctx = service_provider.context().unwrap();
            let service = &service_provider.settings;
            info!("Disabling sync");
            service.disable_sync(&ctx).unwrap();

            info!("Refresh data result: {:#?}", result);
        }
    }
}

// Need to store SyncSettings in db to avoid bootstrap mode
fn bypass_initialisation(service_provider: &ServiceProvider, site_id: u32) {
    let service = &service_provider.settings;
    let ctx = service_provider.context().unwrap();
    info!("Disabling sync");
    service
        .update_sync_settings(
            &ctx,
            &inline_init(|r: &mut SyncSettings| {
                r.url = "http://0.0.0.0:0".to_string();
                r.interval_sec = 100000000;
                r.site_id = site_id;
                r.username = "Sync is disabled (datafile initialise from file".to_string();
            }),
        )
        .unwrap();

    service.disable_sync(&ctx).unwrap();
}

fn export_paths(name: &str) -> (PathBuf, PathBuf, PathBuf) {
    let export_folder = Path::new(DATA_EXPORT_FOLDER).join(name);
    let export_file_path = export_folder.join("export.json");
    let users_file_path = export_folder.join("users.txt");

    (export_folder, export_file_path, users_file_path)
}
