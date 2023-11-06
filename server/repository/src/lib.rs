#[macro_use]
extern crate diesel;
use diesel_migrations::{embed_migrations, EmbeddedMigrations, MigrationHarness};

pub mod database_settings;
pub mod db_diesel;
pub mod diesel_extensions;
pub mod diesel_macros;
pub mod migrations;
pub mod mock;
mod repository_error;
pub mod test_db;
pub use self::db_diesel::*;
pub use self::repository_error::RepositoryError;
pub use database_settings::get_storage_connection_manager;
use diesel::sql_types::Text;
use std::str;

mod tests;

sql_function!(fn lower(x: Text) -> Text);

#[cfg(feature = "postgres")]
pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("./migrations/postgres");
#[cfg(not(feature = "postgres"))]
pub const MIGRATIONS: EmbeddedMigrations = embed_migrations!("./migrations/sqlite");

pub fn run_db_migrations(connection: &StorageConnection) -> Result<(), String> {
    let mut boxed_buffer = Box::new(Vec::new());

    *connection
        .connection
        .run_pending_migrations(MIGRATIONS)
        .map_err(|e| e.to_string())?;

    log::info!(
        "{}",
        str::from_utf8(&boxed_buffer).map_err(|e| e.to_string())?
    );
    Ok(())
}
