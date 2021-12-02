#[macro_use]
extern crate diesel;

pub mod database_settings;
mod db_diesel;
pub mod diesel_extensions;
pub mod diesel_macros;
pub mod mock;
mod repository_error;
pub mod schema;
pub mod test_db;

pub use self::db_diesel::*;
pub use self::repository_error::RepositoryError;
pub use database_settings::get_storage_connection_manager;

mod tests;
