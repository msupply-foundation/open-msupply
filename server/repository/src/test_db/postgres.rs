use diesel::r2d2::{ConnectionManager, Pool};

use crate::{
    database_settings::DatabaseSettings,
    migrations::{migrate, Version},
    StorageConnectionManager,
};

pub fn get_test_db_settings(db_name: &str) -> DatabaseSettings {
    DatabaseSettings {
        username: "postgres".to_string(),
        password: "password".to_string(),
        port: 5432,
        host: "localhost".to_string(),
        database_name: db_name.to_string(),
        init_sql: None,
    }
}

pub async fn setup(db_settings: &DatabaseSettings) -> StorageConnectionManager {
    setup_with_version(db_settings, None).await
}

pub(crate) async fn setup_with_version(
    db_settings: &DatabaseSettings,
    version: Option<Version>,
) -> StorageConnectionManager {
    use diesel::{PgConnection, RunQueryDsl};

    use crate::get_storage_connection_manager;

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

    let connection_manager = get_storage_connection_manager(&db_settings);
    let connection = connection_manager.connection().unwrap();
    migrate(&connection, version).unwrap();

    connection_manager
}
