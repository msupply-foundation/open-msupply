use crate::{
    database_settings::DatabaseSettings,
    db_diesel::{DBBackendConnection, StorageConnection, StorageConnectionManager},
    mock::{insert_mock_data, MockDataCollection, MockDataInserts},
};

use diesel::r2d2::{ConnectionManager, Pool};
use diesel_migrations::{mark_migrations_in_directory, search_for_migrations_directory};

use std::path::{Path, PathBuf};

fn find_test_migration_directory() -> PathBuf {
    // Assume the base path is the base path of one of the project crates:
    match search_for_migrations_directory(Path::new("../repository/migrations")) {
        Ok(path) => path,
        // When running from the IDE tests are run from the root dir:
        Err(_) => search_for_migrations_directory(Path::new("./repository/migrations"))
            .expect("Failed to locate migrations directory"),
    }
}

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

    let mut migrations_dir = find_test_migration_directory();
    migrations_dir.push(MIGRATION_PATH);

    let mut migrations = mark_migrations_in_directory(&connection, &migrations_dir).unwrap();
    migrations.sort_by(|(m, ..), (n, ..)| m.version().cmp(&n.version()));

    for (migration, ..) in migrations.iter() {
        migration.run(&connection).unwrap();
    }
}

#[cfg(not(feature = "postgres"))]
pub async fn setup(db_settings: &DatabaseSettings) {
    use diesel::{Connection, SqliteConnection};
    use std::fs;

    const MIGRATION_PATH: &str = "sqlite";

    let db_path = format!("./{}.sqlite", db_settings.database_name);
    fs::remove_file(&db_path).ok();

    // create parent dirs
    let path = Path::new(&db_path);
    let prefix = path.parent().unwrap();
    fs::create_dir_all(prefix).unwrap();

    let connection = SqliteConnection::establish(&db_path).unwrap();

    let mut migrations_dir = find_test_migration_directory();

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

#[cfg(not(feature = "postgres"))]
fn make_test_db_name(base_name: String) -> String {
    // store all test db files in a test directory
    format!("test_output/{}", base_name)
}

// The following settings work for PG and Sqlite (username, password, host and port are
// ignored for the later)
pub fn get_test_db_settings(db_name: &str) -> DatabaseSettings {
    DatabaseSettings {
        username: "postgres".to_string(),
        password: "password".to_string(),
        port: 5432,
        host: "localhost".to_string(),
        database_name: make_test_db_name(db_name.to_owned()),
    }
}

/// Generic setup method to help setup test enviroment
/// - sets up database (create one and initilises schema), drops existing database
/// - creates connectuion
/// - inserts mock data
pub async fn setup_all(
    db_name: &str,
    inserts: MockDataInserts,
) -> (
    MockDataCollection,
    StorageConnection,
    StorageConnectionManager,
    DatabaseSettings,
) {
    let settings = get_test_db_settings(db_name);

    setup(&settings).await;

    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(&settings.connection_string());
    let pool = Pool::new(connection_manager).expect("Failed to connect to database");

    let storage_connection_manager = StorageConnectionManager::new(pool.clone());

    let connection = storage_connection_manager.connection().unwrap();

    (
        insert_mock_data(&connection, inserts).await,
        connection,
        storage_connection_manager,
        settings,
    )
}
