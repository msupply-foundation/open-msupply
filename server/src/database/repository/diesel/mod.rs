use crate::database::repository::RepositoryError;

mod item;
mod item_line;
mod name;
mod requisition;
mod requisition_line;
mod store;
mod transact;
mod transact_line;
mod user_account;

pub use item::ItemRepository;
pub use item_line::ItemLineRepository;
pub use name::NameRepository;
pub use requisition::RequisitionRepository;
pub use requisition_line::RequisitionLineRepository;
pub use store::StoreRepository;
pub use transact::{CustomerInvoiceRepository, TransactRepository};
pub use transact_line::TransactLineRepository;
pub use user_account::UserAccountRepository;

use diesel::prelude::*;
use diesel::r2d2::ConnectionManager;
use r2d2::{Pool, PooledConnection};

use crate::{server::data::RepositoryMap, util::settings::Settings};

#[cfg(feature = "dieselsqlite")]
type DBBackendConnection = SqliteConnection;

#[cfg(feature = "dieselpg")]
type DBBackendConnection = PgConnection;

impl From<diesel::result::Error> for RepositoryError {
    fn from(err: diesel::result::Error) -> Self {
        let msg = match err {
            diesel::result::Error::InvalidCString(_) => "DIESEL_INVALID_C_STRING".to_string(),
            diesel::result::Error::DatabaseError(err, _) => {
                let err_str = match err {
                    diesel::result::DatabaseErrorKind::UniqueViolation => "UNIQUE_VIOLATION",
                    diesel::result::DatabaseErrorKind::ForeignKeyViolation => {
                        "FOREIGN_KEY_VIOLATION"
                    }
                    diesel::result::DatabaseErrorKind::UnableToSendCommand => {
                        "UNABLE_TO_SEND_COMMAND"
                    }
                    diesel::result::DatabaseErrorKind::SerializationFailure => {
                        "SERIALIZATION_FAILURE"
                    }
                    _ => "UNKNOWN",
                };
                format!("DIESEL_DATABASE_ERROR_{}", err_str)
            }
            diesel::result::Error::NotFound => "DIESEL_NOT_FOUND".to_string(),
            diesel::result::Error::QueryBuilderError(_) => "DIESEL_QUERY_BUILDER_ERROR".to_string(),
            diesel::result::Error::DeserializationError(_) => {
                "DIESEL_DESERIALIZATION_ERROR".to_string()
            }
            diesel::result::Error::SerializationError(_) => {
                "DIESEL_SERIALIZATION_ERROR".to_string()
            }
            diesel::result::Error::RollbackTransaction => "DIESEL_ROLLBACK_TRANSACTION".to_string(),
            diesel::result::Error::AlreadyInTransaction => {
                "DIESEL_ALREADY_IN_TRANSACTION".to_string()
            }
            _ => "DIESEL_UNKNOWN".to_string(),
        };

        RepositoryError { msg }
    }
}

fn get_connection(
    pool: &Pool<ConnectionManager<DBBackendConnection>>,
) -> Result<PooledConnection<ConnectionManager<DBBackendConnection>>, RepositoryError> {
    pool.get().map_err(|_| RepositoryError {
        msg: "Failed to open Connection".to_string(),
    })
}

pub async fn get_repositories(settings: &Settings) -> RepositoryMap {
    // TODO fix connection string for sqlite
    let connection_manager =
        ConnectionManager::<DBBackendConnection>::new(&settings.database.connection_string());
    let pool = Pool::new(connection_manager).expect("Failed to connect to database");

    let mut repositories: RepositoryMap = RepositoryMap::new();

    repositories.insert(CustomerInvoiceRepository::new(pool.clone()));
    repositories.insert(ItemRepository::new(pool.clone()));
    repositories.insert(ItemLineRepository::new(pool.clone()));
    repositories.insert(NameRepository::new(pool.clone()));
    repositories.insert(RequisitionLineRepository::new(pool.clone()));
    repositories.insert(RequisitionRepository::new(pool.clone()));
    repositories.insert(StoreRepository::new(pool.clone()));
    repositories.insert(TransactRepository::new(pool.clone()));
    repositories.insert(TransactLineRepository::new(pool.clone()));
    repositories.insert(UserAccountRepository::new(pool.clone()));

    repositories
}
