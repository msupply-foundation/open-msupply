#[macro_use]
extern crate diesel;

pub mod database_settings;
pub mod db_diesel;
pub mod diesel_extensions;
pub(crate) mod diesel_helper_types;
pub mod diesel_macros;
pub(crate) mod dynamic_query_filter;
pub use dynamic_query_filter::FilterBuilder;
pub mod migrations;
pub mod mock;
mod repository_error;
pub mod syncv7;
pub mod test_db;
pub use self::db_diesel::*;
pub use self::repository_error::RepositoryError;
pub use database_settings::get_storage_connection_manager;
use diesel::sql_types::Text;
use std::str;

mod tests;

define_sql_function!(fn lower(x: Text) -> Text);
