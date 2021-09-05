use thiserror::Error;

#[derive(Error, Debug)]
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
    CustomerInvoiceRepository, ItemLineRepository, ItemRepository, NameRepository,
    RequisitionLineRepository, RequisitionRepository, StoreRepository, TransactLineRepository,
    TransactRepository, UserAccountRepository,
};
