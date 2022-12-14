use std::{fs, path::Path};

use diesel::r2d2::{ConnectionManager, Pool};

use crate::{
    database_settings::{DatabaseSettings, SqliteConnectionOptions},
    migrations::{migrate, Version},
    DBBackendConnection, StorageConnection, StorageConnectionManager,
};

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
     
pub async fn setup(db_settings: &DatabaseSettings) -> StorageConnectionManager {
    setup_with_version(db_settings, None).await
}

pub(crate) async fn setup_with_version(
    db_settings: &DatabaseSettings,
    version: Option<Version>,
) -> StorageConnectionManager {
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
        .min_idle(Some(1))
        .connection_customizer(Box::new(SqliteConnectionOptions {
            busy_timeout_ms: Some(SQLITE_LOCKWAIT_MS),
        }))
        .build(connection_manager)
        .expect("Failed to connect to database");
    let connection = pool.get().expect("Failed to open connection");

    migrate(&StorageConnection::new(connection), version).unwrap();

    StorageConnectionManager::new(pool)
}
