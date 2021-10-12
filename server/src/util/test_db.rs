use crate::database::repository::{
    DBBackendConnection, StorageConnection, StorageConnectionManager,
};

use super::settings::{DatabaseSettings, ServerSettings, Settings, SyncSettings};

use diesel::r2d2::{ConnectionManager, Pool};
use diesel_migrations::{find_migrations_directory, mark_migrations_in_directory};

#[cfg(feature = "postgres")]
pub async fn setup(db_settings: &DatabaseSettings) {
    use diesel::{PgConnection, RunQueryDsl};

    const MIGRATION_PATH: &str = "postgres";

    let connection_manager =
        ConnectionManager::<PgConnection>::new(&db_settings.connection_string_without_db());
    let pool = Pool::new(connection_manager).expect("Failed to connect to database");
    let connection = pool.get().expect("Failed to open connection");

    diesel::sql_query(format!(
        "DROP DATABASE IF EXISTS \"{}\";",
        &db_settings.database_name
    ))
    .execute(&connection)
    .unwrap();

    diesel::sql_query(format!(
        "CREATE DATABASE \"{}\";",
        &db_settings.database_name
    ))
    .execute(&connection)
    .unwrap();

    let connection_manager =
        ConnectionManager::<PgConnection>::new(&db_settings.connection_string());
    let pool = Pool::new(connection_manager).expect("Failed to connect to database");
    let connection = pool.get().expect("Failed to open connection");

    let mut migrations_dir =
        find_migrations_directory().expect("Failed to locate migrations directory");
    migrations_dir.push(MIGRATION_PATH);

    let mut migrations = mark_migrations_in_directory(&connection, &migrations_dir).unwrap();
    migrations.sort_by(|(m, ..), (n, ..)| m.version().cmp(&n.version()));

    for (migration, ..) in migrations.iter() {
        migration.run(&connection).unwrap();
    }
}

#[cfg(feature = "sqlite")]
pub async fn setup(db_settings: &DatabaseSettings) {
    use diesel::{Connection, SqliteConnection};
    use std::fs;

    const MIGRATION_PATH: &str = "sqlite";

    let db_path = format!("./{}.sqlite", db_settings.database_name);
    fs::remove_file(&db_path).ok();

    // create parent dirs
    let path = std::path::Path::new(&db_path);
    let prefix = path.parent().unwrap();
    fs::create_dir_all(prefix).unwrap();

    let connection = SqliteConnection::establish(&db_path).unwrap();

    let mut migrations_dir =
        find_migrations_directory().expect("Failed to locate migrations directory");
    migrations_dir.push(MIGRATION_PATH);

    let mut migrations = mark_migrations_in_directory(&connection, &migrations_dir).unwrap();
    migrations.sort_by(|(m, ..), (n, ..)| m.version().cmp(&n.version()));

    for (migration, ..) in migrations.iter() {
        migration.run(&connection).unwrap();
    }
}

#[cfg(feature = "postgres")]
fn make_test_db_name(base_name: String) -> String {
    base_name
}

#[cfg(feature = "sqlite")]
fn make_test_db_name(base_name: String) -> String {
    // store all test db files in a test directory
    format!("test_output/{}", base_name)
}

// The following settings work for PG and Sqlite (username, password, host and port are
// ignored for the later)
pub fn get_test_settings(db_name: &str) -> Settings {
    Settings {
        server: ServerSettings {
            host: "localhost".to_string(),
            port: 5432,
        },
        database: DatabaseSettings {
            username: "postgres".to_string(),
            password: "password".to_string(),
            port: 5432,
            host: "localhost".to_string(),
            database_name: make_test_db_name(db_name.to_owned()),
        },
        sync: SyncSettings {
            username: "postgres".to_string(),
            password: "password".to_string(),
            port: 5432,
            host: "localhost".to_string(),
            interval: 100000000,
        },
    }
}

pub async fn setup_all(db_name: &str) -> (Settings, StorageConnection) {
    let settings = get_test_settings(db_name);

    setup(&settings.database).await;

    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(&settings.database.connection_string());
    let pool = Pool::new(connection_manager).expect("Failed to connect to database");

    let storage_connection_manager = StorageConnectionManager::new(pool.clone());

    let connection = storage_connection_manager.connection().unwrap();

    (settings, connection)
}
