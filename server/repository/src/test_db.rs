use crate::{
    database_settings::DatabaseSettings,
    db_diesel::{StorageConnection, StorageConnectionManager},
    mock::{insert_all_mock_data, insert_mock_data, MockData, MockDataCollection, MockDataInserts},
    run_db_migrations,
};
use diesel::r2d2::{ConnectionManager, Pool};

#[cfg(feature = "postgres")]
pub async fn setup(db_settings: &DatabaseSettings) -> StorageConnectionManager {
    use diesel::{PgConnection, RunQueryDsl};

    use crate::get_storage_connection_manager;

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

    let connection_manager = get_storage_connection_manager(&db_settings);
    let connection = connection_manager.connection().unwrap();
    run_db_migrations(&connection, false).unwrap();

    connection_manager
}

// feature sqlite
#[cfg(not(feature = "postgres"))]
pub async fn setup(db_settings: &DatabaseSettings) -> StorageConnectionManager {
    use crate::{database_settings::SqliteConnectionOptions, DBBackendConnection};
    use std::{fs, path::Path};

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
    const SQLITE_LOCKWAIT_MS: u32 = 5000; //5 second wait for test lock timeout
    let pool = Pool::builder()
        //.max_size(1)
        .min_idle(Some(1))
        .connection_customizer(Box::new(SqliteConnectionOptions {
            enable_wal: false,
            enable_foreign_keys: true,
            busy_timeout_ms: Some(SQLITE_LOCKWAIT_MS),
        }))
        .build(connection_manager)
        .expect("Failed to connect to database");
    let connection = pool.get().expect("Failed to open connection");

    run_db_migrations(&StorageConnection::new(connection), false).unwrap();

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
        init_sql: None,
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
        init_sql: None,
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
