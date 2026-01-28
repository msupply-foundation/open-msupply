use crate::db_diesel::{DBBackendConnection, StorageConnectionManager};
use diesel::{
    connection::SimpleConnection,
    r2d2::{ConnectionManager, Pool},
};
use log::info;

#[cfg(feature = "postgres")]
use log::warn;
use serde::{Deserialize, Serialize};
use std::time::Duration;

#[cfg(feature = "postgres")]
use std::time::Instant;

// Timeout for waiting for the SQLite lock (https://www.sqlite.org/c3ref/busy_timeout.html).
// A locked DB results in the "SQLite database is locked" error.
#[cfg(not(feature = "postgres"))]
const SQLITE_LOCKWAIT_MS: u32 = 30 * 1000;

#[cfg(not(feature = "postgres"))]
const SQLITE_WAL_PRAGMA: &str = "PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;";

const DEFUALT_CONNECTION_POOL_MAX_CONNECTIONS: u32 = 10;
const DEFAULT_CONNECTION_POOL_TIMEOUT_SECONDS: u64 = 30;

// For production deployments using Postgres (central server), transient outages such as VM restarts
// or temporary "too many clients" errors should not immediately kill the server process.
// Defaulting to 10 minutes aligns with issue #9574 (tolerance of 5–10 minutes).
#[cfg(feature = "postgres")]
const DEFAULT_CONNECTION_RETRY_SECONDS: u64 = 60 * 10;
#[cfg(feature = "postgres")]
const DEFAULT_CONNECTION_RETRY_DELAY_SECONDS: u64 = 5;

#[derive(Deserialize, Serialize, Clone)]
pub struct DatabaseSettings {
    pub username: String,
    pub password: String,
    pub port: u16,
    pub host: String,
    pub database_name: String,
    pub database_path: Option<String>,
    pub connection_pool_max_connections: Option<u32>,
    pub connection_pool_timeout_seconds: Option<u64>,
    /// How long to retry the initial Postgres connection before failing (in seconds).
    ///
    /// Intended to make production deployments more tolerant of transient Postgres outages
    /// (VM restart, brief network flap, max_connections spikes). Set to 0 to fail fast.
    pub connection_retry_seconds: Option<u64>,
    /// SQL run once at startup. For example, to run pragma statements
    pub init_sql: Option<String>,
}

// feature postgres
#[cfg(feature = "postgres")]
impl DatabaseSettings {
    pub fn connection_string(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}/{}",
            self.username,
            urlencoding::encode(&self.password),
            self.host,
            self.port,
            self.database_name
        )
    }

    pub fn connection_string_without_db(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}",
            self.username,
            urlencoding::encode(&self.password),
            self.host,
            self.port
        )
    }

    pub fn startup_sql(&self) -> Option<String> {
        self.init_sql.clone()
    }

    pub fn database_path(&self) -> String {
        self.database_name.clone()
    }
}

// feature sqlite
#[cfg(not(feature = "postgres"))]
impl DatabaseSettings {
    pub fn connection_string(&self) -> String {
        use std::path::Path;
        if self.database_name.ends_with(".sqlite") {
            // just use DB if name ends in .sqlite
            self.database_name.clone()
        } else {
            // first check if database exists on disk. If it does, we will use db filename as is without appending .sqlite
            // Note, using `try_exists()` because we want to be able to store the sqlite file on a different partition or disc.
            // If the disc is a network drive and the drive is temporarily offline it might happen that exists() returns false but doesn't
            // say that there was a network error (not 100% if this really is how exists() work but try_exists seems safer). Then if the drive
            // goes online, creating a new database will run as normal and return two files. This might result in data loss if
            // data from the old file hasn't been synced yet. There are a number of feasible cases where this might occur, for example when mSupply
            // automatically starts after a machine boots up a network drive might also be in the process of being mounted.
            let exists = Path::new(&self.database_name.clone())
                .try_exists()
                .expect("Can't check existence of database file");
            match exists {
                true => self.database_name.clone(),
                false => format!("{}.sqlite", self.database_name.clone()),
            }
        }
    }

    pub fn database_path(&self) -> String {
        match &self.database_path {
            Some(path) => {
                std::fs::create_dir_all(path).expect("failed to create database dir");
                format!("{}/{}", path, self.connection_string())
            }
            None => self.connection_string(),
        }
    }

    pub fn startup_sql(&self) -> Option<String> {
        // For SQLite we want to enable the Write Head Log on server startup
        match &self.init_sql {
            Some(sql_statement) => Some(format!("{sql_statement};{SQLITE_WAL_PRAGMA}")),
            None => Some(SQLITE_WAL_PRAGMA.to_string()),
        }
    }
}

// feature sqlite
#[cfg(not(feature = "postgres"))]
#[derive(Debug)]
pub struct SqliteConnectionOptions {
    pub busy_timeout_ms: Option<u32>,
}
// feature sqlite
#[cfg(not(feature = "postgres"))]
impl diesel::r2d2::CustomizeConnection<diesel::SqliteConnection, diesel::r2d2::Error>
    for SqliteConnectionOptions
{
    // TODO: make relevant sqlite customisation settings configurable at runtime.
    fn on_acquire(&self, conn: &mut diesel::SqliteConnection) -> Result<(), diesel::r2d2::Error> {
        //Set busy_timeout first as setting WAL can generate busy during a write
        if let Some(d) = self.busy_timeout_ms {
            conn.batch_execute(&format!("PRAGMA busy_timeout = {d};"))
                .expect("Can't set busy_timeout in sqlite");
        }

        conn.batch_execute("PRAGMA foreign_keys = ON;")
            .expect("Can't enable foreign_keys in sqlite");

        Ok(())
    }
}

// feature postgres
#[cfg(feature = "postgres")]
pub fn get_storage_connection_manager(settings: &DatabaseSettings) -> StorageConnectionManager {
    use crate::diesel::r2d2::ManageConnection;
    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(&settings.connection_string());

    let retry_seconds = settings
        .connection_retry_seconds
        .unwrap_or(DEFAULT_CONNECTION_RETRY_SECONDS);
    let deadline = if retry_seconds == 0 {
        None
    } else {
        Some(Instant::now() + Duration::from_secs(retry_seconds))
    };

    let mut last_error: Option<String> = None;
    let delay = Duration::from_secs(DEFAULT_CONNECTION_RETRY_DELAY_SECONDS);

    // Check the database connection, and attempt to create the database if required
    // Note: the build() call isn't failing when you have an incorrect server or database name
    // so we need to explicitly call connect() to test the connection
    loop {
        match connection_manager.connect() {
            Ok(_) => break,
            Err(e) => {
                let err_string = e.to_string();

                // Database doesn't exist: attempt to create it, then retry the connection.
                if err_string.contains(
                    format!("database \"{}\" does not exist", &settings.database_name).as_str(),
                ) {
                    info!(
                        "Database {} does not exist. Attempting to create it.",
                        &settings.database_name
                    );
                    let root_connection_manager = ConnectionManager::<DBBackendConnection>::new(
                        &settings.connection_string_without_db(),
                    );

                    // Root connect can also fail transiently (e.g. postgres restarting).
                    let mut root_connection = loop {
                        match root_connection_manager.connect() {
                            Ok(con) => break con,
                            Err(root_err) => {
                                let root_err_string = root_err.to_string();
                                if !should_retry_postgres_connect(&root_err_string)
                                    || is_past_deadline(deadline)
                                {
                                    panic!("Failed to connect to postgres root: {}", root_err);
                                }

                                warn!(
                                    "Waiting for postgres root connection ({}s remaining): {}",
                                    remaining_seconds(deadline),
                                    root_err_string
                                );
                                std::thread::sleep(delay);
                            }
                        }
                    };

                    root_connection
                        .batch_execute(&format!("CREATE DATABASE \"{}\";", &settings.database_name))
                        .expect("Failed to create database");

                    // Retry connecting to the newly created database.
                    continue;
                }

                // Non-retryable errors should fail fast to avoid long hangs on misconfig.
                if !should_retry_postgres_connect(&err_string) || is_past_deadline(deadline) {
                    panic!("Failed to connect to database: {}", e);
                }

                // Avoid spamming identical log lines while waiting.
                if last_error.as_deref() != Some(&err_string) {
                    warn!(
                        "Postgres connection unavailable ({}s remaining): {}",
                        remaining_seconds(deadline),
                        err_string
                    );
                    last_error = Some(err_string);
                }

                std::thread::sleep(delay);
            }
        }
    }

    info!("Connecting to database '{}'", settings.database_name);
    let pool = Pool::builder()
        .max_size(
            settings
                .connection_pool_max_connections
                .unwrap_or(DEFUALT_CONNECTION_POOL_MAX_CONNECTIONS),
        )
        .connection_timeout(Duration::from_secs(
            settings
                .connection_pool_timeout_seconds
                .unwrap_or(DEFAULT_CONNECTION_POOL_TIMEOUT_SECONDS),
        ))
        .build(connection_manager)
        .expect("Failed to connect to database");
    StorageConnectionManager::new(pool)
}

#[cfg(feature = "postgres")]
fn should_retry_postgres_connect(error: &str) -> bool {
    let msg = error.to_lowercase();

    // Fail fast for common configuration errors.
    if msg.contains("password authentication failed")
        || (msg.contains("role") && msg.contains("does not exist"))
        || msg.contains("could not translate host name")
    {
        return false;
    }

    // Retry for transient connectivity issues.
    msg.contains("could not connect to server")
        || msg.contains("connection refused")
        || msg.contains("connection reset")
        || msg.contains("connection timed out")
        || msg.contains("timeout")
        || msg.contains("no route to host")
        || msg.contains("server closed the connection unexpectedly")
        || msg.contains("terminating connection due to administrator command")
        || msg.contains("the database system is starting up")
        || msg.contains("the database system is shutting down")
        || msg.contains("too many clients already")
        || msg.contains("remaining connection slots are reserved")
}

#[cfg(feature = "postgres")]
fn is_past_deadline(deadline: Option<Instant>) -> bool {
    match deadline {
        Some(d) => Instant::now() >= d,
        None => true,
    }
}

#[cfg(feature = "postgres")]
fn remaining_seconds(deadline: Option<Instant>) -> u64 {
    match deadline {
        Some(d) => d
            .checked_duration_since(Instant::now())
            .unwrap_or_default()
            .as_secs(),
        None => 0,
    }
}

// feature sqlite
#[cfg(not(feature = "postgres"))]
pub fn get_storage_connection_manager(settings: &DatabaseSettings) -> StorageConnectionManager {
    info!("Connecting to database '{}'", settings.database_path());
    let db_path = settings.database_path();
    let connection_manager = ConnectionManager::<DBBackendConnection>::new(db_path);
    let pool = Pool::builder()
        .connection_customizer(Box::new(SqliteConnectionOptions {
            busy_timeout_ms: Some(SQLITE_LOCKWAIT_MS),
        }))
        .max_size(
            settings
                .connection_pool_max_connections
                .unwrap_or(DEFUALT_CONNECTION_POOL_MAX_CONNECTIONS),
        )
        .connection_timeout(Duration::from_secs(
            settings
                .connection_pool_timeout_seconds
                .unwrap_or(DEFAULT_CONNECTION_POOL_TIMEOUT_SECONDS),
        ))
        .build(connection_manager)
        .expect("Failed to connect to database");

    StorageConnectionManager::new(pool)
}

#[cfg(test)]
mod database_setting_test {
    use super::DatabaseSettings;

    #[allow(dead_code)]
    pub fn empty_db_settings_with_startup_sql(startup_sql: Option<String>) -> DatabaseSettings {
        DatabaseSettings {
            username: "".to_string(),
            password: "".to_string(),
            port: 0,
            host: "".to_string(),
            database_name: "".to_string(),
            init_sql: startup_sql,
            database_path: None,
            connection_pool_max_connections: None,
            connection_pool_timeout_seconds: None,
            connection_retry_seconds: None,
        }
    }

    // feature sqlite
    #[cfg(not(feature = "postgres"))]
    #[test]
    fn test_database_settings_full_startup_sql() {
        use super::SQLITE_WAL_PRAGMA;

        //Ensure sqlite WAL is enabled if no startup_sql is provided
        assert_eq!(
            empty_db_settings_with_startup_sql(None).startup_sql(),
            Some(SQLITE_WAL_PRAGMA.to_string())
        );
        //Ensure sqlite WAL is enabled if no startup_sql is provided
        let init_sql = "PRAGMA temp_store_directory = '{}';";
        let expected_init_sql = format!("{init_sql};{SQLITE_WAL_PRAGMA}");
        assert_eq!(
            empty_db_settings_with_startup_sql(Some(init_sql.to_string())).startup_sql(),
            Some(expected_init_sql)
        );

        //Ensure sqlite WAL is enabled if init_sql is missing a trailing semicolon
        let init_sql_missing_semi_colon = "PRAGMA temp_store_directory = '{}'";
        let expected_init_sql = format!("{init_sql_missing_semi_colon};{SQLITE_WAL_PRAGMA}");
        assert_eq!(
            empty_db_settings_with_startup_sql(Some(init_sql_missing_semi_colon.to_string()))
                .startup_sql(),
            Some(expected_init_sql)
        )
    }
}
