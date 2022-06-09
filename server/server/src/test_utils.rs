use repository::test_db::get_test_db_settings;
use service::{
    settings::{ServerSettings, Settings},
    sync_settings::SyncSettings,
};

// The following settings work for PG and Sqlite (username, password, host and port are
// ignored for the later)
pub fn get_test_settings(db_name: &str) -> Settings {
    Settings {
        server: ServerSettings {
            port: 5432,
            danger_allow_http: false,
            debug_no_access_control: true,
            cors_origins: vec!["http://localhost:3003".to_string()],
            base_dir: None,
        },
        database: get_test_db_settings(db_name),
        sync: Some(SyncSettings {
            username: "postgres".to_string(),
            password_sha256: "password".to_string(),
            url: "http://localhost:5432".to_string(),
            interval_sec: 100000000,
            central_server_site_id: 0,
            site_id: 1,
            site_hardware_id: "".to_string(),
        }),
    }
}
