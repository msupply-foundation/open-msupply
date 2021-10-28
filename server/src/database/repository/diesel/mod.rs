use crate::{
    database::repository::RepositoryError, server::data::RepositoryMap, util::settings::Settings,
};

mod central_sync_buffer;
mod central_sync_cursor;
mod invoice;
mod invoice_line;
mod invoice_line_query;
mod invoice_query;
mod item;
mod item_query;
mod master_list;
mod master_list_line;
mod master_list_name_join;
mod name;
mod name_query;
mod name_store_join;
mod requisition;
mod requisition_line;
mod stock_line;
mod storage_connection;
mod store;
mod user_account;

use actix_rt::blocking::BlockingError;
pub use central_sync_buffer::CentralSyncBufferRepository;
pub use central_sync_cursor::CentralSyncCursorRepository;
pub use invoice::{OutboundShipmentRepository, InvoiceRepository};
pub use invoice_line::InvoiceLineRepository;
pub use invoice_line_query::{InvoiceLineQueryRepository, InvoiceLineStats};
pub use invoice_query::InvoiceQueryRepository;
pub use item::ItemRepository;
pub use item_query::ItemQueryRepository;
pub use master_list::MasterListRepository;
pub use master_list_line::MasterListLineRepository;
pub use master_list_name_join::MasterListNameJoinRepository;
pub use name::NameRepository;
pub use name_query::NameQueryRepository;
pub use name_store_join::NameStoreJoinRepository;
pub use requisition::RequisitionRepository;
pub use requisition_line::RequisitionLineRepository;
pub use stock_line::StockLineRepository;
pub use storage_connection::{StorageConnection, StorageConnectionManager, TransactionError};
pub use store::StoreRepository;
pub use user_account::UserAccountRepository;

use diesel::{
    prelude::*,
    r2d2::{ConnectionManager, Pool, PooledConnection},
    result::{DatabaseErrorKind as DieselDatabaseErrorKind, Error as DieselError},
};

#[cfg(feature = "sqlite")]
pub type DBBackendConnection = SqliteConnection;

#[cfg(not(feature = "sqlite"))]
pub type DBBackendConnection = PgConnection;

#[cfg(feature = "sqlite")]
pub type DBType = diesel::sqlite::Sqlite;

#[cfg(not(feature = "sqlite"))]
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

impl From<BlockingError<RepositoryError>> for RepositoryError {
    fn from(error: BlockingError<RepositoryError>) -> Self {
        match error {
            BlockingError::Error(error) => error,
            BlockingError::Canceled => RepositoryError::ThreadPoolCanceled,
        }
    }
}

fn get_connection(
    pool: &Pool<ConnectionManager<DBBackendConnection>>,
) -> Result<PooledConnection<ConnectionManager<DBBackendConnection>>, RepositoryError> {
    pool.get().map_err(|error| RepositoryError::DBError {
        msg: "Failed to open Connection".to_string(),
        extra: format!("{:?}", error),
    })
}

pub async fn get_repositories(settings: &Settings) -> RepositoryMap {
    // TODO fix connection string for sqlite
    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(&settings.database.connection_string());
    let pool = Pool::new(connection_manager).expect("Failed to connect to database");

    let mut repositories: RepositoryMap = RepositoryMap::new();
    repositories.insert(StorageConnectionManager::new(pool.clone()));

    repositories
}
