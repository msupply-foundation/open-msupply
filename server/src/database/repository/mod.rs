#[derive(Debug)]
pub struct RepositoryError {
    msg: String,
}

#[cfg_attr(feature = "mock", path = "mock/mod.rs")]
#[cfg_attr(feature = "pgsqlx", path = "pgsqlx/mod.rs")]
#[cfg_attr(
    any(feature = "dieselsqlite", feature = "dieselpg"),
    path = "diesel/mod.rs"
)]
#[cfg_attr(
    all(
        not(feature = "mock"),
        not(feature = "dieselsqlite"),
        not(feature = "dieselpg")
    ),
    path = "pgsqlx/mod.rs"
)]
pub mod repository;

pub use repository::{
    CustomerInvoiceRepository, ItemLineRepository, ItemRepository, NameRepository,
    RequisitionLineRepository, RequisitionRepository, StoreRepository, TransactLineRepository,
    TransactRepository, UserAccountRepository,
};
