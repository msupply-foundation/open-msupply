use repository::{
    mock::{MockDataCollection, MockDataInserts},
    test_db::{self, get_test_db_settings},
    StorageConnection, StorageConnectionManager,
};

use super::settings::{AuthSettings, ServerSettings, Settings, SyncSettings};

// The following settings work for PG and Sqlite (username, password, host and port are
// ignored for the later)
pub fn get_test_settings(db_name: &str) -> Settings {
    Settings {
        server: ServerSettings {
            host: "localhost".to_string(),
            port: 5432,
        },
        database: get_test_db_settings(db_name),
        sync: SyncSettings {
            username: "postgres".to_string(),
            password: "password".to_string(),
            url: "http://localhost:5432".to_string(),
            interval: 100000000,
        },
        auth: AuthSettings {
            token_secret: "testtokensecret".to_string(),
        },
    }
}

pub async fn setup_all(
    db_name: &str,
    inserts: MockDataInserts,
) -> (
    MockDataCollection,
    StorageConnection,
    StorageConnectionManager,
    Settings,
) {
    let repo = test_db::setup_all(db_name, inserts).await;
    (repo.0, repo.1, repo.2, get_test_settings(db_name))
}
