use crate::{
    database::repository::{get_repositories, DBBackendConnection},
    server::data::RepositoryMap,
};

use super::settings::{DatabaseSettings, ServerSettings, Settings, SyncSettings};

use diesel::r2d2::{ConnectionManager, Pool, PooledConnection};
use diesel_migrations::{find_migrations_directory, mark_migrations_in_directory};

#[cfg(feature = "postgres")]
pub async fn setup(db_settings: &DatabaseSettings) {
    use diesel::{PgConnection, RunQueryDsl};

    const MIGRATION_PATH: &str = "postgres";

    let connection_manager =
        ConnectionManager::<PgConnection>::new(&db_settings.connection_string_without_db());
    let pool = Pool::new(connection_manager).expect("Failed to connect to database");
    let connection = pool.get().expect("Failed to open connection");

    diesel::sql_query(format!(
        "DROP DATABASE IF EXISTS \"{}\";",
        &db_settings.database_name
    ))
    .execute(&connection)
    .unwrap();

    diesel::sql_query(format!(
        "CREATE DATABASE \"{}\";",
        &db_settings.database_name
    ))
    .execute(&connection)
    .unwrap();

    let connection_manager =
        ConnectionManager::<PgConnection>::new(&db_settings.connection_string());
    let pool = Pool::new(connection_manager).expect("Failed to connect to database");
    let connection = pool.get().expect("Failed to open connection");

    let mut migrations_dir =
        find_migrations_directory().expect("Failed to locate migrations directory");
    migrations_dir.push(MIGRATION_PATH);

    let mut migrations = mark_migrations_in_directory(&connection, &migrations_dir).unwrap();
    migrations.sort_by(|(m, ..), (n, ..)| m.version().cmp(&n.version()));

    for (migration, ..) in migrations.iter() {
        migration.run(&connection).unwrap();
    }
}

#[cfg(feature = "sqlite")]
pub async fn setup(db_settings: &DatabaseSettings) {
    use diesel::{Connection, SqliteConnection};
    use std::fs;

    const MIGRATION_PATH: &str = "sqlite";

    let db_path = format!("./{}.sqlite", db_settings.database_name);

    fs::remove_file(&db_path).ok();

    let connection = SqliteConnection::establish(&db_path).unwrap();

    let mut migrations_dir =
        find_migrations_directory().expect("Failed to locate migrations directory");
    migrations_dir.push(MIGRATION_PATH);

    let mut migrations = mark_migrations_in_directory(&connection, &migrations_dir).unwrap();
    migrations.sort_by(|(m, ..), (n, ..)| m.version().cmp(&n.version()));

    for (migration, ..) in migrations.iter() {
        migration.run(&connection).unwrap();
    }
}

// The following settings work for PG and Sqlite (username, password, host and port are
// ignored for the later)
pub fn get_test_settings(db_name: &str) -> Settings {
    Settings {
        server: ServerSettings {
            host: "localhost".to_string(),
            port: 5432,
        },
        database: DatabaseSettings {
            username: "postgres".to_string(),
            password: "password".to_string(),
            port: 5432,
            host: "localhost".to_string(),
            database_name: db_name.to_owned(),
        },
        sync: SyncSettings {
            username: "postgres".to_string(),
            password: "password".to_string(),
            port: 5432,
            host: "localhost".to_string(),
            interval: 100000000,
        },
    }
}

/// Test helper to setup enviroment for testing,
///
/// Will create connection, setup repositories and return both pool and a connection
///
/// Only requires database name and a boolean toggle to request repositories to be initilised
pub async fn setup_all(
    db_name: &str,
    all_repositories: bool,
) -> (
    Pool<ConnectionManager<DBBackendConnection>>,
    RepositoryMap,
    PooledConnection<ConnectionManager<DBBackendConnection>>,
) {
    let settings = get_test_settings(db_name);

    setup(&settings.database).await;

    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(&settings.database.connection_string());

    let pool = Pool::new(connection_manager).expect("Failed to connect to database");

    (
        pool.clone(),
        match all_repositories {
            true => get_repositories(&settings).await,
            false => RepositoryMap::new(),
        },
        pool.get().unwrap(),
    )
}
