#[derive(Clone, Debug)]
pub struct RepositoryError {
    msg: String,
}

#[cfg_attr(feature = "mock", path = "mock/mod.rs")]
#[cfg_attr(not(feature = "mock"), path = "pgsqlx/mod.rs")]
mod repository;

pub use repository::{
    CustomerInvoiceRepository, ItemLineRepository, ItemRepository, NameRepository,
    RequisitionLineRepository, RequisitionRepository, StoreRepository, TransactLineRepository,
    TransactRepository, UserAccountRepository,
};
