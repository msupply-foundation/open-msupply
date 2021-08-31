#[derive(Debug)]
pub struct RepositoryError {
    msg: String,
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
