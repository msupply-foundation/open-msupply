#[macro_use]
extern crate diesel;
#[macro_use]
extern crate diesel_migrations;

pub mod database_settings;
pub mod db_diesel;
pub mod diesel_extensions;
pub mod diesel_macros;
pub mod mock;
mod repository_error;
pub mod test_db;

pub use self::db_diesel::*;
pub use self::repository_error::RepositoryError;
pub use database_settings::get_storage_connection_manager;
use diesel::sql_types::Text;

mod tests;

sql_function!(fn lower(x: Text) -> Text);

#[cfg(feature = "postgres")]
embed_migrations!("./migrations/postgres");
#[cfg(not(feature = "postgres"))]
embed_migrations!("./migrations/sqlite");

pub fn run_db_migrations(connection: &StorageConnection, show_output: bool) -> Result<(), String> {
    let mut stream: Box<dyn std::io::Write> = match show_output {
        true => Box::new(std::io::stdout()),
        false => Box::new(std::io::sink()),
    };

    Ok(
        embedded_migrations::run_with_output(&connection.connection, &mut stream)
            .map_err(|err| format!("{}", err))?,
    )
}
