use thiserror::Error;

#[derive(Clone, Error, Debug, PartialEq)]
pub enum RepositoryError {
    /// Row not found but expected at least one row
    #[error("row not found but expected at least one row")]
    NotFound,
    /// Row already exists
    #[error("row already exists")]
    UniqueViolation,
    /// Foreign key constraint is violated
    #[error("foreign key constraint is violated")]
    ForeignKeyViolation,
    /// Other DB related errors
    #[error("DBError: {msg:?}")]
    DBError { msg: String },
}

#[cfg_attr(any(feature = "sqlite", feature = "postgres"), path = "diesel/mod.rs")]
#[cfg_attr(
    not(any(feature = "sqlite", feature = "postgres")),
    path = "mock/mod.rs"
)]
pub mod repository;

pub use repository::{
    get_repositories, CustomerInvoiceRepository, IntegrationRecord, ItemLineRepository,
    ItemRepository, NameRepository, RequisitionLineRepository, RequisitionRepository,
    StoreRepository, SyncRepository, TransactLineRepository, TransactRepository,
    UserAccountRepository,
};
