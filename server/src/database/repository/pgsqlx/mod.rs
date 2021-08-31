use {
    crate::{
        database::repository::RepositoryError, server::data::RepositoryMap,
        util::settings::Settings,
    },
    sqlx::PgPool,
};

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

impl From<sqlx::Error> for RepositoryError {
    fn from(err: sqlx::Error) -> Self {
        let msg = String::from(match err {
            sqlx::Error::Configuration(_) => "SQLX_ERROR_CONFIGURATION",
            sqlx::Error::Database(_) => "SQLX_ERROR_DATABASE",
            sqlx::Error::Io(_) => "SQLX_ERROR_IO",
            sqlx::Error::Tls(_) => "SQLX_ERROR_TLS",
            sqlx::Error::Protocol(_) => "SQLX_ERROR_PROTOCOL",
            sqlx::Error::RowNotFound => return RepositoryError::UniqueViolation,
            sqlx::Error::ColumnIndexOutOfBounds { index: _, len: _ } => {
                "SQLX_ERROR_COLUMN_INDEX_OUT_OF_BOUNDS"
            }
            sqlx::Error::ColumnNotFound(_) => "SQLX_ERROR_COLUMN_NOT_FOUND",
            sqlx::Error::ColumnDecode {
                index: _,
                source: _,
            } => "SQLX_ERROR_COLUMN_DECODE",
            sqlx::Error::Decode(_) => "SQLX_ERROR_DECODE",
            sqlx::Error::PoolTimedOut => "SQLX_ERROR_POOL_TIMED_OUT",
            sqlx::Error::PoolClosed => "SQLX_ERROR_POOL_CLOSED",
            sqlx::Error::WorkerCrashed => "SQLX_ERROR_WORKER_CRASHED",
            sqlx::Error::Migrate(_) => "SQLX_ERROR_MIGRATE",
            _ => "SQLX_ERROR_UNKNOWN",
        });

        RepositoryError::DBError { msg }
    }
}

pub async fn get_repositories(settings: &Settings) -> RepositoryMap {
    let pool: PgPool = PgPool::connect(&settings.database.connection_string())
        .await
        .expect("Failed to connect to database");

    let mut repositories: RepositoryMap = RepositoryMap::new();

    repositories.insert(CustomerInvoiceRepository::new(pool.clone()));
    repositories.insert(ItemRepository::new(pool.clone()));
    repositories.insert(ItemLineRepository::new(pool.clone()));
    repositories.insert(NameRepository::new(pool.clone()));
    repositories.insert(RequisitionRepository::new(pool.clone()));
    repositories.insert(RequisitionLineRepository::new(pool.clone()));
    repositories.insert(StoreRepository::new(pool.clone()));
    repositories.insert(TransactRepository::new(pool.clone()));
    repositories.insert(TransactLineRepository::new(pool.clone()));
    repositories.insert(UserAccountRepository::new(pool.clone()));

    repositories
}
