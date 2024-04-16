use std::{fs, path::Path, sync::Mutex};

use diesel::r2d2::{ConnectionManager, Pool};

use crate::{
    database_settings::{DatabaseSettings, SqliteConnectionOptions},
    migrations::{migrate, Version},
    mock::{all_mock_data, insert_all_mock_data, MockDataCollection, MockDataInserts},
    DBBackendConnection, StorageConnectionManager,
};

use super::constants::{TEMPLATE_MARKER_FILE, TEST_OUTPUT_DIR};

pub fn get_test_db_settings(db_name: &str) -> DatabaseSettings {
    DatabaseSettings {
        username: "postgres".to_string(),
        password: "password".to_string(),
        port: 5432,
        host: "localhost".to_string(),
        // put DB test files into a test directory (also works for in-memory)
        database_name: format!("{}/{}.sqlite", TEST_OUTPUT_DIR, db_name),
        init_sql: None,
        database_path: None,
    }
}

pub async fn setup(db_settings: &DatabaseSettings) -> StorageConnectionManager {
    setup_with_version(db_settings, None, MockDataInserts::none())
        .await
        .0
}

static TEMPLATE_LOCK: Mutex<()> = Mutex::new(());

pub(crate) async fn setup_with_version(
    db_settings: &DatabaseSettings,
    version: Option<Version>,
    inserts: MockDataInserts,
) -> (StorageConnectionManager, MockDataCollection) {
    let db_path = db_settings.connection_string();

    let (connection_manager, collection) = if db_path.starts_with("file:") {
        // memory mode
        let connection_manager = create_db(db_settings, version.clone());
        let mut connection = connection_manager.connection().unwrap();
        let collection = insert_all_mock_data(&mut connection, inserts).await;
        (connection_manager, collection)
    } else {
        // cache db template
        let cache_all_mock_data = inserts == MockDataInserts::all();
        let template_name = if cache_all_mock_data {
            format!(
                "___template_{}_full_mock",
                version.as_ref().unwrap_or(&Version::from_package_json())
            )
        } else {
            format!(
                "___template_{}",
                version.as_ref().unwrap_or(&Version::from_package_json())
            )
        };

        let guard = TEMPLATE_LOCK.lock().unwrap();
        // if marker exists, DB needs to be recreated -> delete all template files
        let marker_path =
            Path::new(&format!("{}/{}", TEST_OUTPUT_DIR, TEMPLATE_MARKER_FILE)).to_path_buf();
        if marker_path.exists() {
            // remove all DB templates
            for entry in fs::read_dir(TEST_OUTPUT_DIR).unwrap() {
                let entry = entry.unwrap();
                if entry.file_name().to_string_lossy() == TEMPLATE_MARKER_FILE {
                    // delete marker after all template DBs to ensure we deleted all DBs, e.g. if
                    // this loop is interrupted
                    continue;
                }
                if entry
                    .file_name()
                    .to_string_lossy()
                    .starts_with("___template_")
                {
                    fs::remove_file(&entry.path()).unwrap();
                }
            }
            // remove marker
            fs::remove_file(&marker_path).unwrap();
        }

        let template_settings = get_test_db_settings(&template_name);
        if !Path::new(&template_settings.database_name).exists() {
            let connection_manager = create_db(&template_settings, version.clone());
            let mut connection = connection_manager.connection().unwrap();
            if cache_all_mock_data {
                insert_all_mock_data(&mut connection, inserts.clone()).await;
            }
        }
        drop(guard);

        // copy template

        // remove existing db file
        fs::remove_file(&db_path).ok();
        // create parent dirs
        let path = Path::new(&db_path);
        let parent = path.parent().unwrap();
        fs::create_dir_all(parent).unwrap();
        fs::copy(&template_settings.database_name, &db_path).unwrap();

        let connection_manager = connection_manager(db_settings);
        let collection = if !cache_all_mock_data {
            let mut connection = connection_manager.connection().unwrap();
            insert_all_mock_data(&mut connection, inserts).await
        } else {
            all_mock_data()
        };
        (connection_manager, collection)
    };

    (connection_manager, collection)
}

fn connection_manager(db_settings: &DatabaseSettings) -> StorageConnectionManager {
    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(db_settings.connection_string());
    const SQLITE_LOCKWAIT_MS: u32 = 10 * 1000; // 10 second wait for test lock timeout
    let pool = Pool::builder()
        .min_idle(Some(1))
        .connection_customizer(Box::new(SqliteConnectionOptions {
            busy_timeout_ms: Some(SQLITE_LOCKWAIT_MS),
        }))
        .build(connection_manager)
        .expect("Failed to connect to database");
    StorageConnectionManager::new(pool)
}

fn create_db(db_settings: &DatabaseSettings, version: Option<Version>) -> StorageConnectionManager {
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

    let connection_manager = connection_manager(db_settings);
    let mut connection = connection_manager
        .connection()
        .expect("Failed to connect to database");

    migrate(&mut connection, version).unwrap();

    connection_manager
}
