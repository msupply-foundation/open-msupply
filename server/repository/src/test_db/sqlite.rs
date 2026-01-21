use std::{
    fs,
    path::{Path, PathBuf},
};

use diesel::r2d2::{ConnectionManager, Pool};
use util::lock_file;

use crate::{
    database_settings::{DatabaseSettings, SqliteConnectionOptions},
    migrations::{migrate, Version},
    mock::{all_mock_data, insert_all_mock_data, MockDataCollection, MockDataInserts},
    DBBackendConnection, StorageConnectionManager,
};

use super::constants::{
    env_msupply_no_test_db_template, find_workspace_root, TEMPLATE_MARKER_FILE, TEST_OUTPUT_DIR,
};

pub fn get_test_db_settings(db_name: &str) -> DatabaseSettings {
    get_test_db_settings_etc(db_name, false)
}

fn get_test_db_settings_etc(db_name: &str, is_template: bool) -> DatabaseSettings {
    DatabaseSettings {
        username: "postgres".to_string(),
        password: "password".to_string(),
        port: 5432,
        host: "localhost".to_string(),
        database_name: if is_template {
            format!("{}/{}.sqlite", template_dir().to_string_lossy(), db_name)
        } else {
            format!("{}/{}.sqlite", TEST_OUTPUT_DIR, db_name)
        },
        init_sql: None,
        database_path: None,
        connection_pool_max_connections: None,
        connection_pool_timeout_seconds: None,
    }
}

pub async fn setup(db_settings: &DatabaseSettings) -> StorageConnectionManager {
    setup_with_version(db_settings, None, MockDataInserts::none())
        .await
        .0
}

// Use same templates between all crates (crates are tested in sequence)
fn template_dir() -> PathBuf {
    find_workspace_root()
        .join("repository")
        .join(TEST_OUTPUT_DIR)
}

async fn setup_with_version_no_template(
    db_settings: &DatabaseSettings,
    version: Option<Version>,
    inserts: MockDataInserts,
) -> (StorageConnectionManager, MockDataCollection) {
    let connection_manager = create_db(db_settings, version.clone());
    let connection = connection_manager.connection().unwrap();
    let collection = insert_all_mock_data(&connection, inserts).await;
    (connection_manager, collection)
}

#[allow(clippy::await_holding_lock)]
pub(crate) async fn setup_with_version(
    db_settings: &DatabaseSettings,
    version: Option<Version>,
    inserts: MockDataInserts,
) -> (StorageConnectionManager, MockDataCollection) {
    let db_path = db_settings.connection_string();
    if env_msupply_no_test_db_template() {
        return setup_with_version_no_template(db_settings, version, inserts).await;
    }

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

    let template_output_dir = template_dir();

    // Checking marker files and template creation should be globally locked.
    let fs_lock = lock_file(template_output_dir.clone(), "___template.lock".to_string())
        .expect("Failed to acquire template fs lock");

    // if marker exists, DB needs to be recreated -> delete all template files
    let marker_path = template_output_dir.join(TEMPLATE_MARKER_FILE);
    if marker_path.exists() {
        // remove all DB templates
        for entry in fs::read_dir(&template_output_dir).unwrap() {
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
                fs::remove_file(entry.path()).unwrap();
            }
        }
        // remove marker
        fs::remove_file(&marker_path).unwrap();
    }

    let template_settings = get_test_db_settings_etc(&template_name, true);
    if !Path::new(&template_settings.database_name).exists() {
        let connection_manager = create_db(&template_settings, version.clone());
        let connection = connection_manager.connection().unwrap();
        if cache_all_mock_data {
            insert_all_mock_data(&connection, inserts.clone()).await;
        }
    }
    drop(fs_lock);

    // copy template

    {
        let db_filename = Path::new(&db_settings.database_name)
            .file_name()
            .and_then(|f| f.to_str())
            .unwrap_or("unknown");

        let _scoped_lock = lock_file(
            template_output_dir.clone(),
            format!("___db_{}.lock", db_filename),
        )
        .expect("Failed to acquire database fs lock");
        // remove existing db file
        fs::remove_file(&db_path).ok();
        // create parent dirs
        let path = Path::new(&db_path);
        let parent = path.parent().unwrap();
        fs::create_dir_all(parent).unwrap();
        fs::copy(&template_settings.database_name, &db_path).unwrap();

        let connection_manager = connection_manager(db_settings);
        let collection = if !cache_all_mock_data {
            let connection = connection_manager.connection().unwrap();
            insert_all_mock_data(&connection, inserts).await
        } else {
            all_mock_data()
        };
        (connection_manager, collection)
    }
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

    // remove existing db file
    fs::remove_file(&db_path).ok();
    // create parent dirs
    let path = Path::new(&db_path);
    let prefix = path.parent().unwrap();
    fs::create_dir_all(prefix).unwrap();

    let connection_manager = connection_manager(db_settings);
    let connection = connection_manager
        .connection()
        .expect("Failed to connect to database");

    migrate(&connection, version).unwrap();

    connection_manager
}
