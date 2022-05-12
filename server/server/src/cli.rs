use clap::StructOpt;
use graphql::schema_builder;
use repository::{get_storage_connection_manager, test_db};
use server::{configuration, settings::Settings, sync::Synchroniser};
use service::{
    auth_data::AuthData,
    login::{LoginInput, LoginService},
    service_provider::ServiceProvider,
    token_bucket::TokenBucket,
};
use std::{
    fs,
    sync::{Arc, RwLock},
};

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
    /// Initilise from running mSupply server (uses configuration/.*yaml for sync credentials), drops existin database, creates new with latest schema and initialises (syncs) initial data from central server (including users)
    InitialiseFromCentral {
        /// Users to sync, in format "username:password,username2:password2"
        #[clap(short, long)]
        users: String,
    },
}

#[tokio::main]
async fn main() {
    let args = Args::parse();

    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");

    match args.action {
        Action::ExportGraphqlSchema => {
            let schema = schema_builder().finish();
            fs::write("schema.graphql", &schema.sdl()).unwrap();
        }
        Action::InitialiseDatabase => {
            test_db::setup(&settings.database).await;
        }
        Action::InitialiseFromCentral { users } => {
            test_db::setup(&settings.database).await;

            let connection_manager = get_storage_connection_manager(&settings.database);
            let service_provider = ServiceProvider::new(connection_manager.clone());

            let sync_settings = settings.sync.unwrap();
            let central_server_url = sync_settings.url.clone();

            let auth_data = AuthData {
                auth_token_secret: "secret".to_string(),
                token_bucket: Arc::new(RwLock::new(TokenBucket::new())),
                debug_no_ssl: true,
                debug_no_access_control: false,
            };

            // Sync data
            Synchroniser::new(sync_settings, connection_manager)
                .unwrap()
                .initial_pull()
                .await
                .unwrap();

            // Sync users
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
        }
    }
}
