use remote_server::util::settings::DatabaseSettings;

#[cfg(not(feature = "dieselsqlite"))]
pub async fn setup(db_settings: &DatabaseSettings) {
    use sqlx::{Connection, Executor, PgConnection, PgPool};
    let mut connection = PgConnection::connect(db_settings.connection_string_without_db().as_str())
        .await
        .unwrap();
    connection
        .execute(format!("DROP DATABASE IF EXISTS \"{}\";", db_settings.database_name).as_str())
        .await
        .unwrap();
    connection
        .execute(format!("CREATE DATABASE \"{}\";", db_settings.database_name).as_str())
        .await
        .unwrap();
    connection.close().await.unwrap();

    let pool = PgPool::connect(db_settings.connection_string().as_str())
        .await
        .expect("Failed to connect to database");

    sqlx::migrate!("migrations/pg").run(&pool).await.unwrap();
}

#[cfg(feature = "dieselsqlite")]
pub async fn setup(db_settings: &DatabaseSettings) {
    use sqlx::{sqlite::SqliteConnectOptions, SqlitePool};
    use std::fs;

    let connection_str = db_settings.connection_string();
    if connection_str != ":memory:" {
        fs::remove_file(connection_str.as_str()).ok();
    }

    let pool = SqlitePool::connect_with(
        SqliteConnectOptions::new()
            .filename(connection_str.as_str())
            .create_if_missing(true),
    )
    .await
    .expect("Failed to connect to database");

    sqlx::migrate!("migrations/sqlite")
        .run(&pool)
        .await
        .unwrap();
}
