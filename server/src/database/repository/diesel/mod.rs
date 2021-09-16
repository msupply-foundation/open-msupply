use crate::{
    database::repository::RepositoryError, server::data::RepositoryMap, util::settings::Settings,
};

mod central_sync_buffer;
mod item;
mod item_line;
mod item_query;
mod master_list;
mod master_list_line;
mod master_list_name_join;
mod name;
mod name_query;
mod requisition;
mod requisition_line;
mod store;
mod sync;
mod transact;
mod transact_line;
mod user_account;

pub use central_sync_buffer::CentralSyncBufferRepository;
pub use item::ItemRepository;
pub use item_line::ItemLineRepository;
pub use item_query::ItemQueryRepository;
pub use master_list::MasterListRepository;
pub use master_list_line::MasterListLineRepository;
pub use master_list_name_join::MasterListNameJoinRepository;
pub use name::NameRepository;
pub use name_query::NameQueryRepository;
pub use requisition::RequisitionRepository;
pub use requisition_line::RequisitionLineRepository;
pub use store::StoreRepository;
pub use sync::{IntegrationRecord, IntegrationUpsertRecord, SyncRepository};
pub use transact::{CustomerInvoiceRepository, TransactRepository};
pub use transact_line::TransactLineRepository;
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

pub type DBConnection = PooledConnection<ConnectionManager<DBBackendConnection>>;

impl From<DieselError> for RepositoryError {
    fn from(err: DieselError) -> Self {
        let msg = match err {
            DieselError::InvalidCString(_) => "DIESEL_INVALID_C_STRING".to_string(),
            DieselError::DatabaseError(err, _) => {
                let err_str = match err {
                    DieselDatabaseErrorKind::UniqueViolation => {
                        return RepositoryError::UniqueViolation
                    }
                    DieselDatabaseErrorKind::ForeignKeyViolation => {
                        return RepositoryError::ForeignKeyViolation
                    }
                    DieselDatabaseErrorKind::UnableToSendCommand => "UNABLE_TO_SEND_COMMAND",
                    DieselDatabaseErrorKind::SerializationFailure => "SERIALIZATION_FAILURE",
                    _ => "UNKNOWN",
                };
                format!("DIESEL_DATABASE_ERROR_{}", err_str)
            }
            DieselError::NotFound => return RepositoryError::NotFound,
            DieselError::QueryBuilderError(_) => "DIESEL_QUERY_BUILDER_ERROR".to_string(),
            DieselError::DeserializationError(_) => "DIESEL_DESERIALIZATION_ERROR".to_string(),
            DieselError::SerializationError(_) => "DIESEL_SERIALIZATION_ERROR".to_string(),
            DieselError::RollbackTransaction => "DIESEL_ROLLBACK_TRANSACTION".to_string(),
            DieselError::AlreadyInTransaction => "DIESEL_ALREADY_IN_TRANSACTION".to_string(),
            _ => "DIESEL_UNKNOWN".to_string(),
        };

        RepositoryError::DBError { msg }
    }
}

fn get_connection(
    pool: &Pool<ConnectionManager<DBBackendConnection>>,
) -> Result<PooledConnection<ConnectionManager<DBBackendConnection>>, RepositoryError> {
    pool.get().map_err(|_| RepositoryError::DBError {
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
    repositories.insert(ItemQueryRepository::new(pool.clone()));
    repositories.insert(NameRepository::new(pool.clone()));
    repositories.insert(NameQueryRepository::new(pool.clone()));
    repositories.insert(RequisitionLineRepository::new(pool.clone()));
    repositories.insert(RequisitionRepository::new(pool.clone()));
    repositories.insert(StoreRepository::new(pool.clone()));
    repositories.insert(TransactRepository::new(pool.clone()));
    repositories.insert(TransactLineRepository::new(pool.clone()));
    repositories.insert(UserAccountRepository::new(pool.clone()));
    repositories.insert(CentralSyncBufferRepository::new(pool.clone()));
    repositories.insert(SyncRepository::new(pool.clone()));
    repositories.insert(MasterListRepository::new(pool.clone()));
    repositories.insert(MasterListLineRepository::new(pool.clone()));
    repositories.insert(MasterListNameJoinRepository::new(pool.clone()));

    repositories
}
