use diesel::r2d2::{ConnectionManager, Pool};
use serde;

use crate::repository::{DBBackendConnection, StorageConnectionManager};

#[derive(serde::Deserialize)]
pub struct DatabaseSettings {
    pub username: String,
    pub password: String,
    pub port: u16,
    pub host: String,
    pub database_name: String,
}

#[cfg(not(feature = "sqlite"))]
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

#[cfg(feature = "sqlite")]
impl DatabaseSettings {
    pub fn connection_string(&self) -> String {
        format!("{}.sqlite", self.database_name)
    }

    pub fn connection_string_without_db(&self) -> String {
        return self.connection_string();
    }
}

pub fn get_storage_connection_manager(settings: &DatabaseSettings) -> StorageConnectionManager {
    // TODO fix connection string for sqlite
    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(&settings.connection_string());
    let pool = Pool::new(connection_manager).expect("Failed to connect to database");
    StorageConnectionManager::new(pool)
}
