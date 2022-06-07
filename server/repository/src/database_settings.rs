use diesel::r2d2::{ConnectionManager, Pool};
// feature sqlite
#[cfg(not(feature = "postgres"))]
use diesel::{connection::SimpleConnection, SqliteConnection};
use serde;

use crate::db_diesel::{DBBackendConnection, StorageConnectionManager};

//WAIT up to 5 SECONDS for lock in SQLITE (https://www.sqlite.org/c3ref/busy_timeout.html)
#[cfg(not(feature = "postgres"))]
const SQLITE_LOCKWAIT_MS: u32 = 5000;

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
    pub enable_wal: bool,
    pub busy_timeout_ms: Option<u32>,
}
// feature sqlite
#[cfg(not(feature = "postgres"))]
impl diesel::r2d2::CustomizeConnection<SqliteConnection, diesel::r2d2::Error>
    for SqliteConnectionOptions
{
    //TODO: make relevant sqlite customisation settings configurable at runtime.
    fn on_acquire(&self, conn: &mut SqliteConnection) -> Result<(), diesel::r2d2::Error> {
        //Set busy_timeout first as setting WAL can generate busy during a write
        if let Some(d) = self.busy_timeout_ms {
            conn.batch_execute(&format!("PRAGMA busy_timeout = {};", d))
                .expect("Can't set busy_timeout in sqlite");
        }

        conn.batch_execute("PRAGMA foreign_keys = ON;")
            .expect("Can't enable foreign_keys in sqlite");

        //TODO: Write Ahead Log is a database level setting and doesn't need to be set on a per connection basis (Unlike busy_timeout and foreign_keys)
        // In theory this should be run at database creation time, not on each acquire
        if self.enable_wal {
            conn.batch_execute("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL;")
                .expect("Can't enable Write Ahead Log (WAL) in sqlite");
        }
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
            enable_wal: true,
            busy_timeout_ms: Some(SQLITE_LOCKWAIT_MS),
        }))
        .build(connection_manager)
        .expect("Failed to connect to database");
    StorageConnectionManager::new(pool)
}
