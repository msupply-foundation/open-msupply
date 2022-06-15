use diesel::r2d2::{ConnectionManager, Pool};
use serde;

use crate::db_diesel::{DBBackendConnection, StorageConnectionManager};

//WAIT up to 5 SECONDS for lock in SQLITE (https://www.sqlite.org/c3ref/busy_timeout.html)
#[cfg(not(feature = "postgres"))]
const SQLITE_LOCKWAIT_MS: u32 = 5000;

#[cfg(not(feature = "postgres"))]
const SQLITE_WAL_PRAGMA: &str = "PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;";

#[derive(serde::Deserialize, Clone)]
pub struct DatabaseSettings {
    pub username: String,
    pub password: String,
    pub port: u16,
    pub host: String,
    pub database_name: String,
    /// SQL run once at startup. For example, to run pragma statements
    pub init_sql: Option<String>,
}

// feature postgres
#[cfg(feature = "postgres")]
impl DatabaseSettings {
    pub fn connection_string(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}/{}",
            self.username, self.password, self.host, self.port, self.database_name
        )
    }

    pub fn connection_string_without_db(&self) -> String {
        format!(
            "postgres://{}:{}@{}:{}",
            self.username, self.password, self.host, self.port
        )
    }

    pub fn full_init_sql(&self) -> Option<String> {
        self.init_sql.clone()
    }
}

// feature sqlite
#[cfg(all(not(feature = "postgres"), not(feature = "memory")))]
impl DatabaseSettings {
    pub fn connection_string(&self) -> String {
        self.database_name.clone()
    }

    pub fn connection_string_without_db(&self) -> String {
        self.connection_string()
    }

    pub fn full_init_sql(&self) -> Option<String> {
        //For SQLite we want to enable the Write Head Log on server startup
        match &self.init_sql {
            Some(sql_statement) => Some(format!("{};{}", sql_statement, SQLITE_WAL_PRAGMA)),
            None => Some(SQLITE_WAL_PRAGMA.to_string()),
        }
    }
}

// feature memory
#[cfg(feature = "memory")]
impl DatabaseSettings {
    pub fn connection_string(&self) -> String {
        format!("file:{}?mode=memory&cache=shared", self.database_name)
    }

    pub fn connection_string_without_db(&self) -> String {
        self.connection_string()
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
    //TODO: make relevant sqlite customisation settings configurable at runtime.
    fn on_acquire(&self, conn: &mut diesel::SqliteConnection) -> Result<(), diesel::r2d2::Error> {
        use diesel::connection::SimpleConnection;
        //Set busy_timeout first as setting WAL can generate busy during a write
        if let Some(d) = self.busy_timeout_ms {
            conn.batch_execute(&format!("PRAGMA busy_timeout = {};", d))
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
    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(&settings.connection_string());
    let pool = Pool::new(connection_manager).expect("Failed to connect to database");
    StorageConnectionManager::new(pool)
}

// feature sqlite
#[cfg(not(feature = "postgres"))]
pub fn get_storage_connection_manager(settings: &DatabaseSettings) -> StorageConnectionManager {
    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(&settings.connection_string());
    let pool = Pool::builder()
        .connection_customizer(Box::new(SqliteConnectionOptions {
            busy_timeout_ms: Some(SQLITE_LOCKWAIT_MS),
        }))
        .build(connection_manager)
        .expect("Failed to connect to database");
    StorageConnectionManager::new(pool)
}

#[cfg(test)]
mod database_setting_test {
    use super::DatabaseSettings;

    pub fn empty_db_settings_with_init_sql(init_sql: Option<String>) -> DatabaseSettings {
        DatabaseSettings {
            username: "".to_string(),
            password: "".to_string(),
            port: 0,
            host: "".to_string(),
            database_name: "".to_string(),
            init_sql,
        }
    }

    // feature sqlite
    #[cfg(not(feature = "postgres"))]
    #[test]
    fn test_database_settings_full_init_sql() {
        use super::SQLITE_WAL_PRAGMA;

        //Ensure sqlite WAL is enabled if no init_sql is provided
        assert_eq!(
            empty_db_settings_with_init_sql(None).full_init_sql(),
            Some(SQLITE_WAL_PRAGMA.to_string())
        );
        //Ensure sqlite WAL is enabled if no init_sql is provided
        let init_sql = "PRAGMA temp_store_directory = '{}';";
        let expected_init_sql = format!("{};{}", init_sql, SQLITE_WAL_PRAGMA);
        assert_eq!(
            empty_db_settings_with_init_sql(Some(init_sql.to_string())).full_init_sql(),
            Some(expected_init_sql)
        );

        //Ensure sqlite WAL is enabled if init_sql is missing a trailing semicoln
        let init_sql_missing_semi_colon = "PRAGMA temp_store_directory = '{}'";
        let expected_init_sql = format!("{};{}", init_sql_missing_semi_colon, SQLITE_WAL_PRAGMA);
        assert_eq!(
            empty_db_settings_with_init_sql(Some(init_sql_missing_semi_colon.to_string()))
                .full_init_sql(),
            Some(expected_init_sql)
        )
    }
}
