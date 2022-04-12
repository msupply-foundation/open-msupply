use crate::{
    database_settings::DatabaseSettings,
    db_diesel::{DBBackendConnection, StorageConnection, StorageConnectionManager},
    mock::{insert_all_mock_data, insert_mock_data, MockData, MockDataCollection, MockDataInserts},
};

use diesel::r2d2::{ConnectionManager, Pool};
use diesel_migrations::mark_migrations_in_directory;

use std::{
    env,
    path::{Path, PathBuf},
};

/// Copy of search_for_diesel_migrations::migration_direcotyr except looking in /repository/migrations
pub fn search_for_migrations_directory(path: &Path) -> Result<PathBuf, String> {
    let migration_path = path.join("repository").join("migrations");
    println!("{:#?}", migration_path.as_os_str());
    if migration_path.is_dir() {
        Ok(migration_path)
    } else {
        path.parent()
            .map(search_for_migrations_directory)
            .unwrap_or(Err("Failed to locate migrations directory".to_string()))
    }
}

fn find_test_migration_directory() -> PathBuf {
    // Assume the base path is the base path of one of the project crates:
    search_for_migrations_directory(Path::new(&env::current_dir().unwrap())).unwrap()
}

#[cfg(feature = "postgres")]
pub async fn setup(db_settings: &DatabaseSettings) -> StorageConnectionManager {
    use diesel::RunQueryDsl;

    // Provision a fresh database
    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(&db_settings.connection_string_without_db());
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

    // Create a connection manager to the just created database and run the migrations
    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(&db_settings.connection_string());
    let pool = Pool::new(connection_manager).expect("Failed to connect to database");
    let connection = pool.get().expect("Failed to open connection");

    const MIGRATION_PATH: &str = "postgres";
    let mut migrations_dir = find_test_migration_directory();
    migrations_dir.push(MIGRATION_PATH);
    let mut migrations = mark_migrations_in_directory(&connection, &migrations_dir).unwrap();
    migrations.sort_by(|(m, ..), (n, ..)| m.version().cmp(&n.version()));
    for (migration, ..) in migrations.iter() {
        migration.run(&connection).unwrap();
    }

    StorageConnectionManager::new(pool)
}

// feature sqlite
#[cfg(not(feature = "postgres"))]
pub async fn setup(db_settings: &DatabaseSettings) -> StorageConnectionManager {
    use std::fs;

    let db_path = db_settings.connection_string();

    // If not in-memory mode clean up and create test directory
    // (in in-memory mode the db_path starts with "file:")
    if !db_path.starts_with("file:") {
        // remove existing db file
        fs::remove_file(&db_path).ok();
        // create parent dirs
        let path = Path::new(&db_path);
        let prefix = path.parent().unwrap();
        fs::create_dir_all(prefix).unwrap();
    }

    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(&db_settings.connection_string());
    let pool = Pool::builder()
        //.max_size(1)
        .min_idle(Some(1))
        .build(connection_manager)
        .expect("Failed to connect to database");
    let connection = pool.get().expect("Failed to open connection");

    const MIGRATION_PATH: &str = "sqlite";
    let mut migrations_dir = find_test_migration_directory();
    migrations_dir.push(MIGRATION_PATH);
    let mut migrations = mark_migrations_in_directory(&connection, &migrations_dir).unwrap();
    migrations.sort_by(|(m, ..), (n, ..)| m.version().cmp(&n.version()));
    for (migration, ..) in migrations.iter() {
        migration.run(&connection).unwrap();
    }

    StorageConnectionManager::new(pool)
}

#[cfg(feature = "postgres")]
pub fn get_test_db_settings(db_name: &str) -> DatabaseSettings {
    DatabaseSettings {
        username: "postgres".to_string(),
        password: "password".to_string(),
        port: 5432,
        host: "localhost".to_string(),
        database_name: db_name.to_string(),
    }
}

// sqlite (username, password, host and port are ignored)
#[cfg(not(feature = "postgres"))]
pub fn get_test_db_settings(db_name: &str) -> DatabaseSettings {
    DatabaseSettings {
        username: "postgres".to_string(),
        password: "password".to_string(),
        port: 5432,
        host: "localhost".to_string(),
        // put DB test files into a test directory (also works for in-memory)
        database_name: format!("test_output/{}.sqlite", db_name),
    }
}

/// Generic setup method to help setup test enviroment
/// - sets up database (create one and initialises schema), drops existing database
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
    setup_all_with_data(db_name, inserts, MockData::default()).await
}

pub async fn setup_all_with_data(
    db_name: &str,
    inserts: MockDataInserts,
    extra_mock_data: MockData,
) -> (
    MockDataCollection,
    StorageConnection,
    StorageConnectionManager,
    DatabaseSettings,
) {
    let settings = get_test_db_settings(db_name);
    let connection_manager = setup(&settings).await;
    let connection = connection_manager.connection().unwrap();

    let core_data = insert_all_mock_data(&connection, inserts).await;
    insert_mock_data(
        &connection,
        MockDataInserts::all(),
        MockDataCollection {
            data: vec![("extra_data".to_string(), extra_mock_data)],
        },
    )
    .await;
    (core_data, connection, connection_manager, settings)
}
