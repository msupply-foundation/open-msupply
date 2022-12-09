#[macro_use]
extern crate diesel;
#[macro_use]
extern crate diesel_migrations;

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
embed_migrations!("./migrations/postgres");
#[cfg(not(feature = "postgres"))]
embed_migrations!("./migrations/sqlite");

pub fn run_db_migrations(connection: &StorageConnection) -> Result<(), String> {
    let mut boxed_buffer = Box::new(Vec::new());
    embedded_migrations::run_with_output(&connection.connection, &mut boxed_buffer)
        .map_err(|e| e.to_string())?;
    // Using log::info for migrations result will make sure they don't appear in test
    log::info!(
        "{}",
        str::from_utf8(&boxed_buffer).map_err(|e| e.to_string())?
    );
    Ok(())
}
