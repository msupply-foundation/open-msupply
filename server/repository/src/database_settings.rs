use crate::db_diesel::{DBBackendConnection, StorageConnectionManager};
use diesel::{
    connection::SimpleConnection,
    r2d2::{ConnectionManager, Pool},
};
use log::info;
use serde::{Deserialize, Serialize};
use std::time::Duration;

// Timeout for waiting for the SQLite lock (https://www.sqlite.org/c3ref/busy_timeout.html).
// A locked DB results in the "SQLite database is locked" error.
#[cfg(not(feature = "postgres"))]
pub(crate) const SQLITE_LOCKWAIT_MS: u32 = 30 * 1000;

#[cfg(not(feature = "postgres"))]
const SQLITE_WAL_PRAGMA: &str = "PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;";

const DEFAULT_CONNECTION_POOL_MAX_CONNECTIONS: u32 = 10;
const DEFAULT_CONNECTION_POOL_TIMEOUT_SECONDS: u64 = 30;

#[derive(Deserialize, Serialize, Clone)]
pub struct DatabaseSettings {
    pub username: String,
    pub password: String,
    pub port: u16,
    pub host: String,
    pub database_name: String,
    pub database_path: Option<String>,
    pub connection_pool_max_connections: Option<u32>,
    pub connection_pool_min_idle: Option<u32>,
    pub connection_pool_timeout_seconds: Option<u64>,
    /// SQL run once at startup. For example, to run pragma statements
    pub init_sql: Option<String>,
}

// feature postgres
#[cfg(feature = "postgres")]
impl DatabaseSettings {
    pub fn connection_string(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}/{}?application_name=open-msupply",
            self.username,
            urlencoding::encode(&self.password),
            self.host,
            self.port,
            self.database_name
        )
    }

    pub fn connection_string_without_db(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}?application_name=open-msupply-no-db",
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
    use crate::diesel_helper_types::Count;
    use diesel::{sql_query, sql_types::Text, RunQueryDsl};

    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(settings.connection_string());

    // Check the database connection, and attempt to create the database if required
    // Note: the build() call isn't failing when you have an incorrect server or database name
    // so we need to explicitly call connect() to test the connection
    if let Err(connect_error) = connection_manager.connect() {
        // The connect error text is localised by the postgres server (lc_messages), so it
        // can't be used to detect a missing database. Connect to the base database and
        // check pg_database instead.
        let root_connection_manager =
            ConnectionManager::<DBBackendConnection>::new(settings.connection_string_without_db());

        let mut root_connection = match root_connection_manager.connect() {
            Ok(connection) => connection,
            Err(root_error) => {
                panic!(
                    "Failed to connect to database: {} (also failed to connect to the base database to check whether it exists: {})",
                    connect_error, root_error
                );
            }
        };

        let count =
            sql_query("SELECT count(*)::bigint AS count FROM pg_database WHERE datname = $1")
                .bind::<Text, _>(&settings.database_name)
                .get_result::<Count>(&mut root_connection)
                .expect("Failed to check whether database exists")
                .count;

        if count > 0 {
            // Database exists, the original connection failure was something else
            panic!("Failed to connect to database: {}", connect_error);
        }

        info!(
            "Database {} does not exist. Attempting to create it.",
            &settings.database_name
        );
        root_connection
            .batch_execute(&format!("CREATE DATABASE \"{}\";", &settings.database_name))
            .expect("Failed to create database");
    }
    info!("Connecting to database '{}'", settings.database_name);
    let pool = Pool::builder()
        .max_size(
            settings
                .connection_pool_max_connections
                .unwrap_or(DEFAULT_CONNECTION_POOL_MAX_CONNECTIONS),
        )
        .min_idle(settings.connection_pool_min_idle)
        .connection_timeout(Duration::from_secs(
            settings
                .connection_pool_timeout_seconds
                .unwrap_or(DEFAULT_CONNECTION_POOL_TIMEOUT_SECONDS),
        ))
        .build(connection_manager)
        .expect("Failed to connect to database");
    StorageConnectionManager::new(pool)
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
                .unwrap_or(DEFAULT_CONNECTION_POOL_MAX_CONNECTIONS),
        )
        .min_idle(settings.connection_pool_min_idle)
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
            connection_pool_min_idle: None,
            connection_pool_timeout_seconds: None,
        }
    }

    // feature postgres
    #[cfg(feature = "postgres")]
    #[test]
    fn test_connection_string_includes_application_name() {
        let settings = DatabaseSettings {
            username: "user".to_string(),
            password: "pass".to_string(),
            port: 5432,
            host: "localhost".to_string(),
            database_name: "testdb".to_string(),
            init_sql: None,
            database_path: None,
            connection_pool_max_connections: None,
            connection_pool_timeout_seconds: None,
            connection_pool_min_idle: None,
        };
        assert_eq!(
            settings.connection_string(),
            "postgres://user:pass@localhost:5432/testdb?application_name=open-msupply"
        );
    }

    // feature postgres
    #[cfg(feature = "postgres")]
    #[test]
    fn test_creates_missing_database() {
        use crate::database_settings::get_storage_connection_manager;
        use crate::test_db::get_test_db_settings;
        use diesel::r2d2::ManageConnection;
        use diesel::{r2d2::ConnectionManager, sql_query, PgConnection, RunQueryDsl};

        let settings = get_test_db_settings("auto_create_db_test");

        let root_connection_manager =
            ConnectionManager::<PgConnection>::new(settings.connection_string_without_db());
        let mut root_connection = root_connection_manager
            .connect()
            .expect("Failed to connect to base database");

        sql_query(format!(
            "DROP DATABASE IF EXISTS \"{}\";",
            settings.database_name
        ))
        .execute(&mut root_connection)
        .unwrap();

        // Database is missing, so this should create it rather than panic
        let connection_manager = get_storage_connection_manager(&settings);
        connection_manager
            .connection()
            .expect("Failed to connect to the newly created database");

        // Best-effort cleanup (fails while the pool above holds connections open, which is fine)
        let _ = sql_query(format!("DROP DATABASE \"{}\";", settings.database_name))
            .execute(&mut root_connection);
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
