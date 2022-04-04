use repository::test_db::get_test_db_settings;
use service::sync_settings::SyncSettings;

use super::settings::{AuthSettings, ServerSettings, Settings};

// The following settings work for PG and Sqlite (username, password, host and port are
// ignored for the later)
pub fn get_test_settings(db_name: &str) -> Settings {
    Settings {
        server: ServerSettings {
            host: "localhost".to_string(),
            port: 5432,
            debug_no_access_control: true,
        },
        database: get_test_db_settings(db_name),
        sync: SyncSettings {
            username: "postgres".to_string(),
            password: "password".to_string(),
            url: "http://localhost:5432".to_string(),
            interval: 100000000,
            central_server_site_id: 0,
            site_id: 1,
            site_hardware_id: "".to_string(),
        },
        auth: AuthSettings {
            token_secret: "testtokensecret".to_string(),
        },
    }
}
