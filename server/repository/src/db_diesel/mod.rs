use crate::repository_error::RepositoryError;

mod central_sync_buffer;
mod changelog_row;
mod consumption;
pub mod diesel_schema;
mod document;
mod document_registry;
mod document_registry_row;
mod filter_sort_pagination;
mod form_schema_row;
mod invoice;
mod invoice_line;
mod invoice_line_row;
mod invoice_row;
mod item;
mod item_row;
mod key_value_store;
mod location;
mod location_row;
mod log;
mod log_row;
mod master_list;
mod master_list_line;
mod master_list_line_row;
mod master_list_name_join;
mod master_list_row;
mod name;
mod name_row;
mod name_store_join;
mod number_row;
mod program;
mod program_row;
mod remote_sync_buffer;
mod report;
mod report_row;
mod requisition;
mod requisition_line;
mod stock_line;
mod stock_line_row;
mod stock_movement;
mod stock_on_hand;
mod stocktake;
mod stocktake_line;
mod stocktake_line_row;
mod stocktake_row;
mod storage_connection;
mod store;
mod store_row;
mod unit_row;
mod user;
mod user_permission;
mod user_permission_row;
mod user_row;
mod user_store_join_row;

pub use self::log::*;
pub use central_sync_buffer::*;
pub use changelog_row::*;
pub use consumption::*;
pub use document::*;
pub use document_registry::*;
pub use document_registry_row::*;
pub use filter_sort_pagination::*;
pub use form_schema_row::*;
pub use invoice::*;
pub use invoice_line::*;
pub use invoice_line_row::*;
pub use invoice_row::*;
pub use item::*;
pub use item_row::*;
pub use key_value_store::*;
pub use location::*;
pub use location_row::*;
pub use log_row::*;
pub use master_list::*;
pub use master_list_line::*;
pub use master_list_line_row::*;
pub use master_list_name_join::*;
pub use master_list_row::*;
pub use name::*;
pub use name_row::*;
pub use name_store_join::*;
pub use number_row::*;
pub use program::*;
pub use program_row::*;
pub use remote_sync_buffer::*;
pub use report::*;
pub use report_row::*;
pub use requisition::*;
pub use requisition_line::*;
pub use stock_line::*;
pub use stock_line_row::*;
pub use stock_movement::*;
pub use stock_on_hand::*;
pub use stocktake::*;
pub use stocktake_line::*;
pub use stocktake_line_row::*;
pub use stocktake_row::*;
pub use storage_connection::*;
pub use store::*;
pub use store_row::*;
pub use unit_row::*;
pub use user::*;
pub use user_permission::*;
pub use user_permission_row::*;
pub use user_row::*;
pub use user_store_join_row::*;

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool, PooledConnection},
    result::{DatabaseErrorKind as DieselDatabaseErrorKind, Error as DieselError},
};

#[cfg(not(feature = "postgres"))]
pub type DBBackendConnection = SqliteConnection;

#[cfg(feature = "postgres")]
pub type DBBackendConnection = PgConnection;

#[cfg(not(feature = "postgres"))]
pub type DBType = diesel::sqlite::Sqlite;

#[cfg(feature = "postgres")]
pub type DBType = diesel::pg::Pg;

pub type DBConnection = PooledConnection<ConnectionManager<DBBackendConnection>>;

impl From<DieselError> for RepositoryError {
    fn from(err: DieselError) -> Self {
        use RepositoryError as Error;
        match err {
            DieselError::InvalidCString(extra) => {
                Error::as_db_error("DIESEL_INVALID_C_STRING", extra)
            }
            DieselError::DatabaseError(err, extra) => {
                let extra = format!("{:?}", extra);
                match err {
                    DieselDatabaseErrorKind::UniqueViolation => Error::UniqueViolation(extra),
                    DieselDatabaseErrorKind::ForeignKeyViolation => {
                        Error::ForeignKeyViolation(extra)
                    }
                    DieselDatabaseErrorKind::UnableToSendCommand => {
                        Error::as_db_error("UNABLE_TO_SEND_COMMAND", extra)
                    }
                    DieselDatabaseErrorKind::SerializationFailure => {
                        Error::as_db_error("SERIALIZATION_FAILURE", extra)
                    }
                    DieselDatabaseErrorKind::__Unknown => Error::as_db_error("UNKNOWN", extra),
                }
            }
            DieselError::NotFound => RepositoryError::NotFound,
            DieselError::QueryBuilderError(extra) => {
                Error::as_db_error("DIESEL_QUERY_BUILDER_ERROR", extra)
            }
            DieselError::DeserializationError(extra) => {
                Error::as_db_error("DIESEL_DESERIALIZATION_ERROR", extra)
            }
            DieselError::SerializationError(extra) => {
                Error::as_db_error("DIESEL_SERIALIZATION_ERROR", extra)
            }
            DieselError::RollbackTransaction => {
                Error::as_db_error("DIESEL_ROLLBACK_TRANSACTION", "")
            }
            DieselError::AlreadyInTransaction => {
                Error::as_db_error("DIESEL_ALREADY_IN_TRANSACTION", "")
            }
            _ => {
                // try to get a more detailed diesel msg:
                let diesel_msg = format!("{}", err);
                Error::as_db_error("DIESEL_UNKNOWN", diesel_msg)
            }
        }
    }
}

fn get_connection(
    pool: &Pool<ConnectionManager<DBBackendConnection>>,
) -> Result<DBConnection, RepositoryError> {
    pool.get().map_err(|error| RepositoryError::DBError {
        msg: "Failed to open Connection".to_string(),
        extra: format!("{:?}", error),
    })
}
