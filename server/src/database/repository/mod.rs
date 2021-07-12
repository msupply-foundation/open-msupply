#[derive(Debug)]
pub struct RepositoryError {
    msg: String,
}

#[cfg_attr(feature = "mock", path = "mock/mod.rs")]
#[cfg_attr(not(feature = "mock"), path = "pgsqlx/mod.rs")]
mod implementation;

pub use implementation::{
    CustomerInvoiceRepository, ItemLineRepository, ItemRepository, NameRepository,
    RequisitionLineRepository, RequisitionRepository, StoreRepository, TransactLineRepository,
    TransactRepository, UserAccountRepository,
};
