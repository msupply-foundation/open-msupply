use chrono::Utc;
use clap::StructOpt;
use demo::RefreshDatesRepository;
use repository::{get_storage_connection_manager, KeyValueStoreRepository, KeyValueType, ChangelogRowRepository};
use server::{configuration, settings::Settings};

/// omSupply demo cli
#[derive(clap::Parser)]
#[clap(version, about)]
struct Args {
    #[clap(subcommand)]
    action: Action,
}

#[derive(clap::Subcommand)]
enum Action {
    /// Make data current, base on latest date difference to now
    RefreshData,
}

fn main() {
    let args = Args::parse();

    let settings: Settings =
        configuration::get_configuration().expect("Failed to parse configuration settings");

    match args.action {
        Action::RefreshData => {
            let connection_manager = get_storage_connection_manager(&settings.database);
            let connection = connection_manager.connection().unwrap();

            let result = RefreshDatesRepository::new(&connection)
                .refresh_dates(Utc::now().naive_local())
                .expect("Error while refreshing data");

            println!("Refresh data result: {:#?}", result);

            // Update cursor
            let latest_change_log = ChangelogRowRepository::new(&connection)
                .latest_changelog()
                .unwrap();
            if let Some(latest_change_log) = latest_change_log {
                let new_cursor = latest_change_log.id as i32 + 1;
                KeyValueStoreRepository::new(&connection)
                    .set_i32(KeyValueType::RemoteSyncPushCursor, Some(new_cursor))
                    .unwrap();
                println!("Cursor updated to {}", new_cursor)
            }
        }
    }
}
